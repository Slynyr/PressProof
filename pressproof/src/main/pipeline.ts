// src/main/pipeline.ts

import { v4 as uuidv4 } from 'uuid'
import type { ScanConfig, ScanResult, PipelineEvent, ProofreadingIssue } from '@shared/types'
import { discoverPages, fetchPage } from './providers/scraper'
import { parsePageHtml } from './providers/parser'
import { createProvider } from './providers/registry'

// The pipeline calls this function every time something noteworthy happens.
// ipc.ts will supply a real implementation that sends events to the renderer.
export type EmitFn = (event: PipelineEvent) => void

export async function runScan(
  config: ScanConfig,
  emit: EmitFn,
  signal: AbortSignal   
): Promise<ScanResult> {
  const provider = createProvider(config)
  const scanId = uuidv4()
  const startedAt = new Date().toISOString()

  let pages
  let bookTitle: string
  try {
    const discovery = await discoverPages(config.url)
    pages = discovery.pages
    bookTitle = discovery.bookTitle
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const errorMsg = `Failed to load book from ${config.url}: ${message}`
    emit({ type: 'error', message: errorMsg, fatal: true })
    emit({ type: 'complete', summary: { total: 0, critical: 0, warnings: 0, note: 0 } })
    const { apiKey: _removed, ...savedConfig } = config
    return {
      id: scanId,
      config: savedConfig,
      bookTitle: config.url,
      scanName: config.url,
      bookUrl: config.url,
      status: 'error' as const,
      startedAt,
      completedAt: new Date().toISOString(),
      totalPages: 0,
      pagesScanned: 0,
      issues: [],
      errors: [errorMsg],
      failedPages: [],
      starred: false,
      summary: { total: 0, critical: 0, warnings: 0, note: 0 }
    }
  }

  if (config.scanMode === 'range' && config.pageFrom != null && config.pageTo != null) {
    pages = pages.slice(config.pageFrom - 1, config.pageTo)
  }

  // Debug: print all discovered pages to the main process console before scanning
  console.log(`[PressProof] Discovered ${pages.length} pages:`)
  pages.forEach((p, i) => console.log(`  ${i + 1}. [${p.chapter}] "${p.title}" — ${p.url}`))

  const scanName = pages[0]?.chapter ?? bookTitle

  emit({ type: 'discovery', totalPages: pages.length, bookTitle, scanName })

  const allIssues: ProofreadingIssue[] = []
  const allErrors: string[] = []
  const failedPages: Array<{ url: string; title: string; chapter: string }> = []
  let pagesScanned = 0
  let fatalError = false

  // Errors tagged with these prefixes mean retrying won't help — stop the scan
  const FATAL_TAGS = ['[AUTH]', '[RATE_LIMIT]']

  for (let i = 0; i < pages.length; i++) {
    // Check for cancellation or fatal error between each page
    if (signal.aborted || fatalError) break

    const page = pages[i]
    emit({ type: 'page_start', page: i + 1, url: page.url, title: page.title })

    try {
      const html = await fetchPage(page.url)
      const markdown = parsePageHtml(html)

      // Debug: show how much content the parser extracted and a preview
      console.log(`[PressProof] Page ${i + 1} parsed — ${markdown.length} chars`)
      console.log(`--- MARKDOWN PREVIEW ---\n${markdown.slice(0, 500)}\n--- END PREVIEW ---`)

      const pageContext = {
        pageUrl: page.url,
        pageTitle: page.title,
        chapter: page.chapter
      }

      let issues: ProofreadingIssue[]
      try {
        issues = await provider.proofread(markdown, pageContext)
      } catch (firstErr) {
        const firstMsg = firstErr instanceof Error ? firstErr.message : String(firstErr)
        // Auto-retry once for parse errors (model returned invalid JSON)
        if (firstMsg.startsWith('[PARSE_ERROR]')) {
          console.log(`[PressProof] Page ${i + 1} got parse error, retrying once...`)
          issues = await provider.proofread(markdown, pageContext)
        } else {
          throw firstErr
        }
      }

      for (const issue of issues) {
        emit({ type: 'issue_found', issue })
        allIssues.push(issue)
        console.log(`  [${issue.severity.toUpperCase()}] ${issue.category}: ${issue.description}`)
        console.log(`    Original: "${issue.originalText}"`)
        console.log(`    Fix:      "${issue.suggestedFix}"`)
      }

      pagesScanned++
      emit({ type: 'page_complete', page: i + 1, issuesFound: issues.length })
      console.log(`[PressProof] Page ${i + 1} complete — ${issues.length} issue(s) found`)

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const isFatal = FATAL_TAGS.some(tag => message.startsWith(tag))

      if (isFatal) {
        fatalError = true
        // Strip the tag prefix for user-facing message
        const cleanMessage = message.replace(/^\[\w+\]\s*/, '')
        allErrors.push(cleanMessage)
        emit({ type: 'error', message: cleanMessage, fatal: true })
        console.error(`[PressProof] FATAL: ${message} — stopping scan`)
      } else {
        const errorMsg = `Failed on "${page.title}": ${message.replace(/^\[\w+\]\s*/, '')}`
        allErrors.push(errorMsg)
        failedPages.push({ url: page.url, title: page.title, chapter: page.chapter })
        emit({ type: 'error', message: errorMsg, fatal: false })
        emit({ type: 'page_complete', page: i + 1, issuesFound: 0 })
      }
    }
  }

  const summary = {
    total: allIssues.length,
    critical: allIssues.filter(i => i.severity === 'critical').length,
    warnings: allIssues.filter(i => i.severity === 'warning').length,
    note: allIssues.filter(i => i.severity === 'note').length
  }

  emit({ type: 'complete', summary })

  const { apiKey: _removed, ...savedConfig } = config

  // Determine final status
  let status: 'success' | 'incomplete' | 'error'
  if (fatalError || (pagesScanned === 0 && allErrors.length > 0)) {
    status = 'error'
  } else if (signal.aborted || allErrors.length > 0) {
    status = 'incomplete'
  } else {
    status = 'success'
  }

  return {
    id: scanId,
    config: savedConfig,
    bookTitle,
    scanName,
    bookUrl: config.url,
    status,
    startedAt,
    completedAt: new Date().toISOString(),
    totalPages: pages.length,
    pagesScanned,
    issues: allIssues,
    errors: allErrors,
    failedPages,
    starred: false,
    summary
  }
}

/**
 * Retry only the failed pages from a previous scan.
 * Returns an updated ScanResult with successful retries merged in.
 */
export async function retryFailedPages(
  scan: ScanResult,
  apiKey: string,
  emit: EmitFn,
  signal: AbortSignal
): Promise<ScanResult> {
  const pagesToRetry = scan.failedPages
  if (!pagesToRetry || pagesToRetry.length === 0) return scan

  const config: ScanConfig = { ...scan.config, apiKey } as ScanConfig & { apiKey: string }
  const provider = createProvider(config)

  emit({ type: 'discovery', totalPages: pagesToRetry.length, bookTitle: scan.bookTitle, scanName: scan.scanName })

  const newIssues: ProofreadingIssue[] = []
  const newErrors: string[] = []
  const stillFailed: Array<{ url: string; title: string; chapter: string }> = []
  let retrySuccesses = 0

  for (let i = 0; i < pagesToRetry.length; i++) {
    if (signal.aborted) break

    const page = pagesToRetry[i]
    emit({ type: 'page_start', page: i + 1, url: page.url, title: page.title })

    try {
      const html = await fetchPage(page.url)
      const markdown = parsePageHtml(html)
      const issues = await provider.proofread(markdown, {
        pageUrl: page.url,
        pageTitle: page.title,
        chapter: page.chapter
      })

      for (const issue of issues) {
        emit({ type: 'issue_found', issue })
        newIssues.push(issue)
      }

      retrySuccesses++
      emit({ type: 'page_complete', page: i + 1, issuesFound: issues.length })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const errorMsg = `Failed on "${page.title}": ${message.replace(/^\[\w+\]\s*/, '')}`
      newErrors.push(errorMsg)
      stillFailed.push(page)
      emit({ type: 'error', message: errorMsg, fatal: false })
      emit({ type: 'page_complete', page: i + 1, issuesFound: 0 })
    }
  }

  // Merge results into the existing scan
  const mergedIssues = [...scan.issues, ...newIssues]
  const summary = {
    total: mergedIssues.length,
    critical: mergedIssues.filter(i => i.severity === 'critical').length,
    warnings: mergedIssues.filter(i => i.severity === 'warning').length,
    note: mergedIssues.filter(i => i.severity === 'note').length
  }

  emit({ type: 'complete', summary })

  const mergedErrors = stillFailed.length > 0
    ? newErrors
    : []

  const status: ScanResult['status'] = stillFailed.length > 0 ? 'incomplete' : 'success'

  return {
    ...scan,
    status,
    pagesScanned: scan.pagesScanned + retrySuccesses,
    issues: mergedIssues,
    errors: mergedErrors,
    failedPages: stillFailed,
    summary
  }
}

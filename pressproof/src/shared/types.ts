export interface ProofreadingIssue {
    id: string
    pageUrl: string
    pageTitle: string
    chapter: string
    category: 'Spelling' | 'Grammar' | 'Formatting' | 'Consistency'| 'Reference' | 'Other'
    severity: 'critical' | 'warning' | 'note'
    description: string
    originalText: string
    suggestedFix: string
    explanation: string
    confidence: number
    status: 'open' | 'ignored' | 'resolved'
    detectedAt: string
    sourceLocation?: string
}

export interface ScanConfig {
    url: string
    provider: 'openai' | 'claude'
    apiKey: string
    model?: string
    scanMode: 'full' | 'range'
    pageFrom?: number
    pageTo?: number
    customInstructions?: string
}

export interface ScanResult {
    id: string
    config: Omit<ScanConfig, 'apiKey'>
    bookTitle: string
    scanName: string
    bookUrl: string
    status: 'running' | 'success' | 'incomplete' | 'error'
    startedAt: string
    completedAt?: string
    totalPages: number
    pagesScanned: number
    issues: ProofreadingIssue[]
    errors: string[]
    failedPages: Array<{ url: string; title: string; chapter: string }>
    starred: boolean
    importedAt?: string
    summary: {
        total: number
        critical: number
        warnings: number
        note: number
    }
}

/** Lightweight metadata for the sidebar (no issues array) */
export type ScanMeta = Omit<ScanResult, 'issues'>

export type PipelineEvent = 
  | { type: 'discovery'; totalPages: number; bookTitle: string; scanName: string }
  | { type: 'page_start'; page: number; url: string; title: string }
  | { type: 'page_complete'; page: number; issuesFound: number }
  | { type: 'issue_found'; issue: ProofreadingIssue }
  | { type: 'complete'; summary: ScanResult['summary'] }
  | { type: 'error'; message: string; fatal: boolean }
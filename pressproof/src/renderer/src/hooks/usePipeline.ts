import { useState, useCallback, useEffect, useRef } from 'react'
import type { ScanConfig, ScanResult, PipelineEvent, ProofreadingIssue } from '@shared/types'

export interface PipelineState {
  isRunning: boolean
  bookTitle: string
  scanName: string
  totalPages: number
  currentPage: number
  currentPageTitle: string
  pagesCompleted: number
  issues: ProofreadingIssue[]
  summary: { total: number; critical: number; warnings: number; note: number }
  errors: string[]
  log: PipelineEvent[]
}

const initialState: PipelineState = {
  isRunning: false,
  bookTitle: '',
  scanName: '',
  totalPages: 0,
  currentPage: 0,
  currentPageTitle: '',
  pagesCompleted: 0,
  issues: [],
  summary: { total: 0, critical: 0, warnings: 0, note: 0 },
  errors: [],
  log: []
}

export function usePipeline() {
  const [state, setState] = useState<PipelineState>(initialState)
  const [result, setResult] = useState<ScanResult | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  // Clean up listener on unmount
  useEffect(() => {
    return () => { cleanupRef.current?.() }
  }, [])

  const startScan = useCallback(async (config: ScanConfig): Promise<ScanResult | null> => {
    setState({ ...initialState, isRunning: true })
    setResult(null)

    // Listen for pipeline events
    const cleanup = window.api.onScanEvent((_event, data) => {
      const evt = data as PipelineEvent
      setState(prev => {
        const log = [...prev.log, evt]
        switch (evt.type) {
          case 'discovery':
            return { ...prev, log, totalPages: evt.totalPages, bookTitle: evt.bookTitle, scanName: evt.scanName }
          case 'page_start':
            return { ...prev, log, currentPage: evt.page, currentPageTitle: evt.title }
          case 'page_complete':
            return { ...prev, log, pagesCompleted: prev.pagesCompleted + 1 }
          case 'issue_found':
            return {
              ...prev,
              log,
              issues: [...prev.issues, evt.issue],
              summary: {
                total: prev.summary.total + 1,
                critical: prev.summary.critical + (evt.issue.severity === 'critical' ? 1 : 0),
                warnings: prev.summary.warnings + (evt.issue.severity === 'warning' ? 1 : 0),
                note: prev.summary.note + (evt.issue.severity === 'note' ? 1 : 0)
              }
            }
          case 'error':
            return { ...prev, log, errors: [...prev.errors, evt.message] }
          case 'complete':
            return { ...prev, log, summary: evt.summary }
          default:
            return { ...prev, log }
        }
      })
    })
    cleanupRef.current = cleanup

    try {
      const scanResult = await window.api.startScan(config) as ScanResult
      setResult(scanResult)
      setState(prev => ({ ...prev, isRunning: false }))
      return scanResult
    } catch (err) {
      setState(prev => ({
        ...prev,
        isRunning: false,
        errors: [...prev.errors, err instanceof Error ? err.message : String(err)]
      }))
      return null
    } finally {
      cleanup()
      cleanupRef.current = null
    }
  }, [])

  const retryFailed = useCallback(async (scanId: string, apiKey: string): Promise<ScanResult | null> => {
    setState({ ...initialState, isRunning: true })

    const cleanup = window.api.onScanEvent((_event, data) => {
      const evt = data as PipelineEvent
      setState(prev => {
        const log = [...prev.log, evt]
        switch (evt.type) {
          case 'discovery':
            return { ...prev, log, totalPages: evt.totalPages }
          case 'page_start':
            return { ...prev, log, currentPage: evt.page, currentPageTitle: evt.title }
          case 'page_complete':
            return { ...prev, log, pagesCompleted: prev.pagesCompleted + 1 }
          case 'issue_found':
            return { ...prev, log }
          case 'error':
            return { ...prev, log, errors: [...prev.errors, evt.message] }
          case 'complete':
            return { ...prev, log }
          default:
            return { ...prev, log }
        }
      })
    })
    cleanupRef.current = cleanup

    try {
      const scanResult = await window.api.retryFailedPages(scanId, apiKey) as ScanResult
      setResult(scanResult)
      setState(prev => ({ ...prev, isRunning: false }))
      return scanResult
    } catch (err) {
      setState(prev => ({
        ...prev,
        isRunning: false,
        errors: [...prev.errors, err instanceof Error ? err.message : String(err)]
      }))
      return null
    } finally {
      cleanup()
      cleanupRef.current = null
    }
  }, [])

  const cancelScan = useCallback(() => {
    window.api.cancelScan()
    setState(prev => ({ ...prev, isRunning: false }))
  }, [])

  const reset = useCallback(() => {
    setState(initialState)
    setResult(null)
  }, [])

  return { state, result, startScan, retryFailed, cancelScan, reset }
}

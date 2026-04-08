import { useState, useCallback } from 'react'
import type { ScanConfig, ScanResult } from '@shared/types'
import { usePipeline } from './hooks/usePipeline'
import { useSavedAudits } from './hooks/useSavedAudits'
import { HomeScreen } from './components/HomeScreen'
import { AuditConsole } from './components/AuditConsole'

type Screen = 'home' | 'console'

function App(): React.JSX.Element {
  const [screen, setScreen] = useState<Screen>('home')
  const [currentScan, setCurrentScan] = useState<ScanResult | null>(null)
  const pipeline = usePipeline()
  const savedAudits = useSavedAudits()

  const handleStartAudit = useCallback(async (config: ScanConfig) => {
    // Go straight to the console — issues will stream in via pipeline state
    setCurrentScan(null)
    setScreen('console')
    const result = await pipeline.startScan(config)
    if (result) {
      setCurrentScan(result)
      await savedAudits.refresh()
    }
  }, [pipeline, savedAudits])

  const handleLoadAudit = useCallback(async (id: string) => {
    const scan = await savedAudits.loadAudit(id)
    if (scan) {
      setCurrentScan(scan)
      setScreen('console')
    }
  }, [savedAudits])

  const handleImport = useCallback(async () => {
    const scan = await savedAudits.importAudit()
    if (scan) {
      setCurrentScan(scan)
      setScreen('console')
    }
  }, [savedAudits])

  const handleNewScan = useCallback(() => {
    pipeline.reset()
    setCurrentScan(null)
    setScreen('home')
  }, [pipeline])

  const handleExport = useCallback(async (id: string, format: 'json' | 'csv') => {
    await savedAudits.exportAudit(id, format)
  }, [savedAudits])

  const handleUpdateIssues = useCallback(async (issueIds: string[], status: 'open' | 'ignored' | 'resolved') => {
    if (!currentScan) return
    await window.api.updateIssueStatuses(currentScan.id, issueIds, status)
    const updated = await savedAudits.loadAudit(currentScan.id)
    if (updated) setCurrentScan(updated)
  }, [currentScan, savedAudits])

  const handleDeleteAudit = useCallback(async (id: string) => {
    await savedAudits.deleteAudit(id)
    // If we're viewing the deleted scan, go back home
    if (currentScan?.id === id) {
      setCurrentScan(null)
      setScreen('home')
    }
  }, [savedAudits, currentScan])

  const handleRetryFailed = useCallback(async () => {
    if (!currentScan || !currentScan.failedPages?.length) return
    // Load the API key for the provider used in this scan
    const keys = await window.api.loadApiKeys()
    const apiKey = keys[currentScan.config.provider]
    if (!apiKey) return
    const result = await pipeline.retryFailed(currentScan.id, apiKey)
    if (result) {
      setCurrentScan(result)
      await savedAudits.refresh()
    }
  }, [currentScan, pipeline, savedAudits])

  const handleCancelScan = useCallback(() => {
    pipeline.cancelScan()
    // Stay on console if we have issues, otherwise go home
    if (pipeline.state.issues.length === 0 && !currentScan) {
      setScreen('home')
    }
  }, [pipeline, currentScan])

  if (screen === 'console') {
    return (
      <AuditConsole
        scan={currentScan}
        pipelineState={pipeline.state}
        onNewScan={handleNewScan}
        onExport={handleExport}
        onUpdateIssues={handleUpdateIssues}
        onCancelScan={handleCancelScan}
        onRetryFailed={handleRetryFailed}
      />
    )
  }

  return (
    <HomeScreen
      onStartAudit={handleStartAudit}
      onImport={handleImport}
      onLoadAudit={handleLoadAudit}
      onToggleStar={savedAudits.toggleStar}
      onDeleteAudit={handleDeleteAudit}
      audits={savedAudits.audits}
    />
  )
}

export default App

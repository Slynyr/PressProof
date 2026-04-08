import { useState, useCallback, useEffect } from 'react'
import type { ScanMeta, ScanResult } from '@shared/types'

export function useSavedAudits() {
  const [audits, setAudits] = useState<ScanMeta[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const list = await window.api.listScans() as ScanMeta[]
      setAudits(list)
    } catch (err) {
      console.error('Failed to list scans:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const loadAudit = useCallback(async (id: string): Promise<ScanResult | null> => {
    try {
      return await window.api.loadScan(id) as ScanResult
    } catch (err) {
      console.error('Failed to load scan:', err)
      return null
    }
  }, [])

  const deleteAudit = useCallback(async (id: string) => {
    await window.api.deleteScan(id)
    await refresh()
  }, [refresh])

  const toggleStar = useCallback(async (id: string, starred: boolean) => {
    await window.api.updateScanStarred(id, starred)
    await refresh()
  }, [refresh])

  const importAudit = useCallback(async (): Promise<ScanResult | null> => {
    try {
      const scan = await window.api.importScan() as ScanResult | null
      if (scan) await refresh()
      return scan
    } catch (err) {
      console.error('Failed to import scan:', err)
      return null
    }
  }, [refresh])

  const exportAudit = useCallback(async (id: string, format: 'json' | 'csv' = 'json') => {
    await window.api.exportScan(id, format)
  }, [])

  return { audits, loading, refresh, loadAudit, deleteAudit, toggleStar, importAudit, exportAudit }
}

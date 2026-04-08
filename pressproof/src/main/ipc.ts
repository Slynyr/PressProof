import { ipcMain, BrowserWindow, dialog } from 'electron'
import { readFile, writeFile } from 'fs/promises'
import type { ScanConfig, ScanResult } from '@shared/types'
import { runScan, retryFailedPages } from './pipeline'
import { saveScan, loadScan, listScans, deleteScan, updateScanStarred, updateIssueStatuses, loadApiKeys, saveApiKeys } from './storage'
import type { ApiKeys } from './storage'

let activeController: AbortController | null = null

export function registerIpcHandlers(): void {
  // ── Scan lifecycle ──────────────────────────────────────────────────

  ipcMain.handle('scan:start', async (event, config: ScanConfig) => {
    if (activeController) activeController.abort()
    activeController = new AbortController()

    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) throw new Error('Could not find sender window')

    const emit: Parameters<typeof runScan>[1] = (pipelineEvent) => {
      if (!win.isDestroyed()) {
        win.webContents.send('scan:event', pipelineEvent)
      }
    }

    try {
      const result = await runScan(config, emit, activeController.signal)
      // Auto-save completed scans
      await saveScan(result)
      return result
    } finally {
      activeController = null
    }
  })

  ipcMain.handle('scan:retry', async (event, scanId: string, apiKey: string) => {
    if (activeController) activeController.abort()
    activeController = new AbortController()

    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) throw new Error('Could not find sender window')

    const scan = await loadScan(scanId)

    const emit: Parameters<typeof runScan>[1] = (pipelineEvent) => {
      if (!win.isDestroyed()) {
        win.webContents.send('scan:event', pipelineEvent)
      }
    }

    try {
      const result = await retryFailedPages(scan, apiKey, emit, activeController.signal)
      await saveScan(result)
      return result
    } finally {
      activeController = null
    }
  })

  ipcMain.on('scan:cancel', () => {
    if (activeController) {
      activeController.abort()
      activeController = null
    }
  })

  // ── Storage ─────────────────────────────────────────────────────────

  ipcMain.handle('scan:save', async (_event, result: ScanResult) => {
    await saveScan(result)
  })

  ipcMain.handle('scan:list', async () => {
    return await listScans()
  })

  ipcMain.handle('scan:load', async (_event, id: string) => {
    return await loadScan(id)
  })

  ipcMain.handle('scan:delete', async (_event, id: string) => {
    await deleteScan(id)
  })

  ipcMain.handle('scan:star', async (_event, id: string, starred: boolean) => {
    await updateScanStarred(id, starred)
  })

  // ── Issue management ────────────────────────────────────────────────

  ipcMain.handle('issues:update', async (_event, scanId: string, issueIds: string[], status: string) => {
    await updateIssueStatuses(scanId, issueIds, status as 'open' | 'ignored' | 'resolved')
  })

  // ── API Keys ───────────────────────────────────────────────────────

  ipcMain.handle('apikeys:load', async () => {
    return await loadApiKeys()
  })

  ipcMain.handle('apikeys:save', async (_event, keys: ApiKeys) => {
    await saveApiKeys(keys)
  })

  // ── Import / Export ─────────────────────────────────────────────────

  ipcMain.handle('scan:import', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) throw new Error('Could not find sender window')

    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Import Audit Log',
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
      properties: ['openFile']
    })

    if (canceled || filePaths.length === 0) return null

    const raw = await readFile(filePaths[0], 'utf-8')
    const scan = JSON.parse(raw) as ScanResult

    // Basic validation
    if (!scan.id || !scan.issues || !scan.summary) {
      throw new Error('Invalid scan file format')
    }

    // Stamp import timestamp so UI can distinguish imported scans
    scan.importedAt = new Date().toISOString()

    await saveScan(scan)
    return scan
  })

  ipcMain.handle('scan:export', async (event, id: string, format: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) throw new Error('Could not find sender window')

    const scan = await loadScan(id)

    const ext = format === 'csv' ? 'csv' : 'json'
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Export Audit Report',
      defaultPath: `pressproof-${scan.bookTitle.replace(/[^a-z0-9]/gi, '-')}.${ext}`,
      filters: [
        format === 'csv'
          ? { name: 'CSV Files', extensions: ['csv'] }
          : { name: 'JSON Files', extensions: ['json'] }
      ]
    })

    if (canceled || !filePath) return

    if (format === 'csv') {
      const header = 'ID,Severity,Category,Chapter,Description,Original Text,Suggested Fix,Confidence,Status\n'
      const rows = scan.issues.map(i =>
        [i.id, i.severity, i.category, i.chapter, i.description, i.originalText, i.suggestedFix, i.confidence, i.status]
          .map(v => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      ).join('\n')
      await writeFile(filePath, header + rows, 'utf-8')
    } else {
      await writeFile(filePath, JSON.stringify(scan, null, 2), 'utf-8')
    }
  })
}

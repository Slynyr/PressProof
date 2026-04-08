import { contextBridge, ipcRenderer } from 'electron'

// Typed API exposed to the renderer
const api = {
  // Scan lifecycle
  startScan: (config: unknown): Promise<unknown> =>
    ipcRenderer.invoke('scan:start', config),
  retryFailedPages: (scanId: string, apiKey: string): Promise<unknown> =>
    ipcRenderer.invoke('scan:retry', scanId, apiKey),
  cancelScan: (): void => {
    ipcRenderer.send('scan:cancel')
  },
  onScanEvent: (callback: (_event: unknown, data: unknown) => void): (() => void) => {
    ipcRenderer.on('scan:event', callback)
    return () => { ipcRenderer.removeListener('scan:event', callback) }
  },

  // Storage
  saveScan: (result: unknown): Promise<void> =>
    ipcRenderer.invoke('scan:save', result),
  listScans: (): Promise<unknown[]> =>
    ipcRenderer.invoke('scan:list'),
  loadScan: (id: string): Promise<unknown> =>
    ipcRenderer.invoke('scan:load', id),
  deleteScan: (id: string): Promise<void> =>
    ipcRenderer.invoke('scan:delete', id),

  // Issue management
  updateIssueStatuses: (scanId: string, issueIds: string[], status: string): Promise<void> =>
    ipcRenderer.invoke('issues:update', scanId, issueIds, status),
  updateScanStarred: (id: string, starred: boolean): Promise<void> =>
    ipcRenderer.invoke('scan:star', id, starred),

  // Import/Export
  importScan: (): Promise<unknown> =>
    ipcRenderer.invoke('scan:import'),
  exportScan: (id: string, format: string): Promise<void> =>
    ipcRenderer.invoke('scan:export', id, format),

  // API Keys
  loadApiKeys: (): Promise<Record<string, string>> =>
    ipcRenderer.invoke('apikeys:load'),
  saveApiKeys: (keys: Record<string, string>): Promise<void> =>
    ipcRenderer.invoke('apikeys:save', keys),
}

export type PressProofAPI = typeof api

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.api = api
}

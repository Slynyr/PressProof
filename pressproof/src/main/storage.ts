// src/main/storage.ts — JSON-based scan persistence in Electron userData

import { app } from 'electron'
import { join } from 'path'
import { readdir, readFile, writeFile, unlink, mkdir } from 'fs/promises'
import type { ScanResult, ScanMeta } from '@shared/types'

const SCANS_DIR = join(app.getPath('userData'), 'scans')

async function ensureDir(): Promise<void> {
  await mkdir(SCANS_DIR, { recursive: true })
}

function fileName(id: string): string {
  return join(SCANS_DIR, `${id}.json`)
}

export async function saveScan(result: ScanResult): Promise<void> {
  await ensureDir()
  await writeFile(fileName(result.id), JSON.stringify(result, null, 2), 'utf-8')
}

export async function loadScan(id: string): Promise<ScanResult> {
  const raw = await readFile(fileName(id), 'utf-8')
  return JSON.parse(raw) as ScanResult
}

export async function listScans(): Promise<ScanMeta[]> {
  await ensureDir()
  const files = await readdir(SCANS_DIR)
  const jsonFiles = files.filter(f => f.endsWith('.json'))

  const metas: ScanMeta[] = []
  for (const file of jsonFiles) {
    try {
      const raw = await readFile(join(SCANS_DIR, file), 'utf-8')
      const scan = JSON.parse(raw) as ScanResult
      // Return metadata only (strip the issues array)
      const { issues: _, ...meta } = scan
      metas.push(meta)
    } catch {
      // Skip corrupt files
    }
  }

  // Sort by most recent first
  metas.sort((a, b) => {
    const ta = a.completedAt ?? a.startedAt
    const tb = b.completedAt ?? b.startedAt
    return tb.localeCompare(ta)
  })

  return metas
}

export async function deleteScan(id: string): Promise<void> {
  await unlink(fileName(id))
}

export async function updateScanStarred(id: string, starred: boolean): Promise<void> {
  const scan = await loadScan(id)
  scan.starred = starred
  await saveScan(scan)
}

export async function updateIssueStatuses(
  scanId: string,
  issueIds: string[],
  status: 'open' | 'ignored' | 'resolved'
): Promise<void> {
  const scan = await loadScan(scanId)
  const idSet = new Set(issueIds)
  for (const issue of scan.issues) {
    if (idSet.has(issue.id)) {
      issue.status = status
    }
  }
  await saveScan(scan)
}

// ── API Key persistence ─────────────────────────────────────────────────

const KEYS_FILE = join(app.getPath('userData'), 'api-keys.json')

export type ApiKeys = Record<string, string>

export async function loadApiKeys(): Promise<ApiKeys> {
  try {
    const raw = await readFile(KEYS_FILE, 'utf-8')
    return JSON.parse(raw) as ApiKeys
  } catch {
    return {}
  }
}

export async function saveApiKeys(keys: ApiKeys): Promise<void> {
  await writeFile(KEYS_FILE, JSON.stringify(keys, null, 2), 'utf-8')
}

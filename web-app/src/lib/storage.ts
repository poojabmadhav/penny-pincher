import type { FileRecord } from '../types'

const STORAGE_KEY = 'pennypincher_history'
const MAX_RECORDS = 20

export function loadHistory(): FileRecord[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored) as FileRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveHistory(records: FileRecord[]): void {
  try {
    const capped = records.slice(0, MAX_RECORDS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(capped))
  } catch {
    console.error('Failed to save history to localStorage')
  }
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    console.error('Failed to clear history')
  }
}

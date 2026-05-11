import type { FileRecord } from '@/types'

const STORAGE_KEY = 'pennypincher_v2'
const MAX_RECORDS = 20
// File history uses sessionStorage — clears when tab/browser is closed.
// Merchant rules and category overrides use localStorage so they persist across sessions.
const historyStore = sessionStorage
const OVERRIDES_KEY = 'pennypincher_cat_overrides'
const MERCHANT_RULES_KEY = 'pennypincher_merchant_rules'

export function loadHistory(): FileRecord[] {
  try {
    const stored = historyStore.getItem(STORAGE_KEY)
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
    historyStore.setItem(STORAGE_KEY, JSON.stringify(capped))
  } catch {
    console.error('Failed to save history to sessionStorage')
  }
}

export function clearHistory(): void {
  try {
    historyStore.removeItem(STORAGE_KEY)
  } catch {
    console.error('Failed to clear history')
  }
}

// Category overrides: stable per-transaction key "date|merchant|amount" → category
export function loadCategoryOverrides(): Record<string, string> {
  try {
    const stored = localStorage.getItem(OVERRIDES_KEY)
    return stored ? (JSON.parse(stored) as Record<string, string>) : {}
  } catch {
    return {}
  }
}

export function saveCategoryOverride(key: string, category: string): void {
  try {
    const current = loadCategoryOverrides()
    current[key] = category
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(current))
  } catch {}
}

// Merchant rules: normalised merchant name → preferred category (applied on next upload)
export function loadMerchantRules(): Record<string, string> {
  try {
    const stored = localStorage.getItem(MERCHANT_RULES_KEY)
    return stored ? (JSON.parse(stored) as Record<string, string>) : {}
  } catch {
    return {}
  }
}

export function saveMerchantRule(merchant: string, category: string): void {
  try {
    const current = loadMerchantRules()
    current[merchant.toLowerCase().trim()] = category
    localStorage.setItem(MERCHANT_RULES_KEY, JSON.stringify(current))
  } catch {}
}

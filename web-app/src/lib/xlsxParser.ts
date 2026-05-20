import * as XLSX from 'xlsx'
import type { Transaction, AccountType } from '@/types'
import { normalizeDate, parseAmount } from '@/lib/csvParser'
import { categorize } from '@/lib/categorizer'

interface ParsedXLSX {
  format: 'xlsx'
  transactions: Transaction[]
}

interface ColumnIndices {
  dateIdx: number
  merchantIdx: number
  amountIdx: number
  debitIdx: number
  creditIdx: number
  typeIdx: number
}

// Score headers to find columns, returning the index of the best match.
// excludeIdx prevents double-assigning a column already claimed for another purpose.
function scoreColumn(headers: string[], keywords: string[], excludeIdx: Set<number> = new Set()): number {
  const normalized = headers.map(h => String(h ?? '').toLowerCase().trim())
  let bestIdx = -1
  let bestScore = 0

  for (let i = 0; i < normalized.length; i++) {
    if (excludeIdx.has(i)) continue
    const h = normalized[i]
    let score = 0
    for (const k of keywords) {
      if (h === k) score += 100 // exact match
      else if (h.includes(k)) score += 50 // partial match
    }
    if (score > bestScore) {
      bestScore = score
      bestIdx = i
    }
  }

  return bestScore > 0 ? bestIdx : -1
}

// Detect columns by scoring headers against known keywords.
// Columns are assigned greedily in priority order; each claimed index is excluded
// from subsequent searches so "Value Date" can't also become the amount column.
function detectColumns(headers: string[]): ColumnIndices {
  const claimed = new Set<number>()
  const claim = (idx: number) => { if (idx >= 0) claimed.add(idx); return idx }

  const dateIdx = claim(scoreColumn(headers, [
    'date',
    'posted date',
    'trans date',
    'transaction date',
    'post date',
    'posting date',
    'value date',
    'effective date',
  ]))

  const merchantIdx = claim(scoreColumn(headers, [
    'merchant',
    'description',
    'payee',
    'name',
    'memo',
    'narrative',
    'details',
    'transaction',
  ], claimed))

  const amountIdx = claim(scoreColumn(headers, [
    'amount',
    'transaction amount',
    'value',
    'net amount',
  ], claimed))

  const debitIdx = claim(scoreColumn(headers, [
    'debit',
    'withdrawal',
    'money out',
    'charge',
  ], claimed))

  const creditIdx = claim(scoreColumn(headers, [
    'credit',
    'deposit',
    'money in',
    'payment',
  ], claimed))

  const typeIdx = scoreColumn(headers, ['type', 'transaction type', 'tx type'], claimed)

  return { dateIdx, merchantIdx, amountIdx, debitIdx, creditIdx, typeIdx }
}

// Convert any cell value to a string date (YYYY-MM-DD)
function cellToDate(cell: any): string {
  if (!cell) return ''

  // XLSX can return dates as JS Date objects
  if (cell instanceof Date) {
    return normalizeDate(cell.toLocaleDateString('en-US'))
  }

  // XLSX can return dates as numeric serials (days since 1900-01-01)
  if (typeof cell === 'number') {
    // Excel date serial: 1 = 1900-01-01, 60 = 1900-02-29 (leap year bug), 61 = 1900-03-01
    const excelEpoch = new Date(1900, 0, 1)
    const targetDate = new Date(excelEpoch.getTime() + (cell - 1) * 24 * 60 * 60 * 1000)
    return normalizeDate(targetDate.toLocaleDateString('en-US'))
  }

  // Otherwise treat as string
  return normalizeDate(String(cell))
}

// Determine the amount and sign for a transaction row
function getAmount(
  row: any[],
  { amountIdx, debitIdx, creditIdx, typeIdx }: ColumnIndices,
  _headers: string[]
): number {
  // Case 1: Single amount column
  if (amountIdx >= 0) {
    const raw = parseAmount(String(row[amountIdx] ?? ''))

    // If we have mixed signs, use as-is
    if (Math.abs(raw) > 0 && (raw > 0 || raw < 0)) {
      return raw
    }

    // If all positive and we have a type column (debit/credit), use that to set sign
    if (raw > 0 && typeIdx >= 0) {
      const type = String(row[typeIdx] ?? '').toLowerCase().trim()
      return type === 'credit' || type === 'deposit' ? raw : -raw
    }

    // If all positive and no type column, assume expenses (negate)
    return raw > 0 ? -raw : raw
  }

  // Case 2: Separate debit/credit columns
  if (debitIdx >= 0 || creditIdx >= 0) {
    const debit = parseAmount(String(row[debitIdx] ?? ''))
    const credit = parseAmount(String(row[creditIdx] ?? ''))
    // Debit = expense (negative), Credit = income (positive)
    return credit > 0 ? credit : -debit
  }

  return 0
}

export function parseXLSX(buffer: ArrayBuffer, accountType: AccountType = 'personal'): ParsedXLSX {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('XLSX file has no sheets')

  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]

  if (!rows.length) throw new Error('XLSX sheet is empty')

  // Find header row: prefer a row that contains both date and amount/debit keywords.
  // This skips metadata/title rows that many banks prepend before the real header.
  let headerIdx = 0
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i] ?? []
    if (row.length < 3) continue
    const joined = row.map(c => String(c ?? '').toLowerCase()).join('|')
    const hasDate = /date|posted|trans|effective/.test(joined)
    const hasAmt = /amount|debit|credit|withdrawal|deposit|value|money/.test(joined)
    if (hasDate && hasAmt) {
      headerIdx = i
      break
    }
    // Fallback: first sufficiently wide row if no keyword row found in top 10
    if (i === 0) headerIdx = 0
  }

  const headers = rows[headerIdx] ?? []
  const dataRows = rows.slice(headerIdx + 1)

  if (!headers.length) throw new Error('No headers found in XLSX')

  const cols = detectColumns(headers)

  // Validate we have the minimum required columns
  if (cols.dateIdx < 0 || cols.merchantIdx < 0) {
    throw new Error('Could not auto-detect date and merchant/description columns')
  }

  if (cols.amountIdx < 0 && cols.debitIdx < 0) {
    throw new Error('Could not auto-detect amount or debit/credit columns')
  }

  // Parse transactions
  let transactions: Transaction[] = dataRows
    .filter(r => r && r.length > 0)
    .map(row => {
      const date = cellToDate(row[cols.dateIdx])
      const merchant = String(row[cols.merchantIdx] ?? '').trim()
      const amount = getAmount(row, cols, headers)

      return {
        date,
        merchant,
        description: merchant,
        amount,
        source: 'Excel Import',
        original_category: 'Uncategorized',
      }
    })
    .filter(t => t.date && t.merchant && t.amount !== 0)
    .map(t => ({
      ...t,
      original_category: categorize(t.merchant, t.description, accountType),
    }))

  return { format: 'xlsx', transactions }
}

import type { Transaction, AccountType } from '@/types'
import { categorize } from '@/lib/categorizer'

export type BankFormat =
  | 'pennypincher'
  | 'chase'
  | 'bofa'
  | 'capital_one'
  | 'discover'
  | 'schwab'
  | 'citi'
  | 'mint'
  | 'ynab'
  | 'wells_fargo'
  | 'amex'
  | 'generic'

interface ParsedCSV {
  format: BankFormat
  transactions: Transaction[]
}

// ─── String utilities ────────────────────────────────────────────────────────

function cleanContent(raw: string): string {
  return raw
    .replace(/^﻿/, '')    // strip BOM
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
}

function detectDelimiter(line: string): string {
  const pipes = (line.match(/\|/g) ?? []).length
  const semis = (line.match(/;/g) ?? []).length
  const commas = (line.match(/,/g) ?? []).length
  if (pipes > commas && pipes > semis) return '|'
  if (semis > commas) return ';'
  return ','
}

function parseLine(line: string, delim: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
      else inQ = !inQ
    } else if (ch === delim && !inQ) {
      result.push(cur.trim().replace(/^"|"$/g, ''))
      cur = ''
    } else {
      cur += ch
    }
  }
  result.push(cur.trim().replace(/^"|"$/g, ''))
  return result
}

// ─── Date normalisation ───────────────────────────────────────────────────────

/**
 * Convert any common date string to YYYY-MM-DD.
 * Assumes US (MM/DD/YYYY) unless we detect DD/MM unambiguously.
 */
export function normalizeDate(raw: string): string {
  const s = raw.trim().replace(/['"]/g, '')
  if (!s) return ''

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s

  // MM/DD/YYYY or M/D/YYYY  (US standard)
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (us) return `${us[3]}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}`

  // MM/DD/YY
  const us2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/)
  if (us2) {
    const yr = parseInt(us2[3]) > 30 ? `19${us2[3]}` : `20${us2[3]}`
    return `${yr}-${us2[1].padStart(2, '0')}-${us2[2].padStart(2, '0')}`
  }

  // YYYY/MM/DD
  const iso2 = s.match(/^(\d{4})\/(\d{2})\/(\d{2})$/)
  if (iso2) return `${iso2[1]}-${iso2[2]}-${iso2[3]}`

  // DD-MM-YYYY (some EU banks)
  const eu = s.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (eu && parseInt(eu[1]) > 12) return `${eu[3]}-${eu[2]}-${eu[1]}`

  // Month-name formats:  "Jan 15, 2024"  /  "15 Jan 2024"  /  "January 15 2024"
  const monName = s.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/)
  if (monName) {
    const d = new Date(`${monName[1]} ${monName[2]} ${monName[3]}`)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  }
  const monName2 = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/)
  if (monName2) {
    const d = new Date(`${monName2[2]} ${monName2[1]} ${monName2[3]}`)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  }

  // Native Date fallback
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]

  return s
}

// ─── Amount normalisation ─────────────────────────────────────────────────────

export function parseAmount(raw: string): number {
  if (!raw || raw.trim() === '') return 0
  let s = raw.trim().replace(/['"$£€¥₹\s]/g, '')

  // Parentheses = negative: (123.45)
  if (s.startsWith('(') && s.endsWith(')')) s = '-' + s.slice(1, -1)

  // European: 1.234,56  →  1234.56
  if (/^\-?\d{1,3}(\.\d{3})+,\d{1,2}$/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else {
    s = s.replace(/,/g, '') // strip US thousands separator
  }

  return parseFloat(s) || 0
}

// ─── Row parsing ──────────────────────────────────────────────────────────────

function parseRows(content: string): { rows: string[][], delim: string } {
  const lines = cleanContent(content)
    .split('\n')
    .filter(l => l.trim() && !l.trimStart().startsWith('#'))
  if (!lines.length) return { rows: [], delim: ',' }
  const delim = detectDelimiter(lines[0])
  return { rows: lines.map(l => parseLine(l, delim)), delim }
}

/**
 * Skip metadata/title rows some banks add before the actual CSV header.
 * A real header row has at least 3 columns and contains date + amount keywords.
 */
function findHeaderIndex(rows: string[][]): number {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const h = rows[i].join('|').toLowerCase()
    const hasDate = /\bdate\b|trans|posted/.test(h)
    const hasAmt = /amount|debit|credit|withdrawal|deposit|value/.test(h)
    if (rows[i].length >= 3 && hasDate && hasAmt) return i
  }
  // Wells Fargo has no header — first row is data with MM/DD/YYYY date
  return 0
}

function colIdx(headers: string[], ...candidates: string[]): number {
  const norm = headers.map(h => h.toLowerCase().trim())
  for (const c of candidates) {
    const i = norm.findIndex(h => h === c || h.includes(c))
    if (i !== -1) return i
  }
  return -1
}

// ─── Format detection ─────────────────────────────────────────────────────────

function detectFormat(headers: string[]): BankFormat {
  const h = headers.map(x => x.toLowerCase().trim())
  const has = (...t: string[]) => t.every(x => h.some(c => c.includes(x)))
  const any = (...t: string[]) => t.some(x => h.some(c => c.includes(x)))

  if (has('merchant', 'category')) return 'pennypincher'

  // Mint: "original description" column is unique to Mint
  if (any('original description')) return 'mint'

  // YNAB: payee + memo + outflow/inflow  OR  date + payee + memo + amount
  if (has('payee') && any('outflow', 'inflow')) return 'ynab'
  if (has('payee', 'memo') && has('amount') && !any('posting date', 'card')) return 'ynab'

  // Chase: "posting date" + ("details" or "type")
  if (has('posting date') && any('details', 'type')) return 'chase'

  // Capital One: "transaction date" + "posted date" (card statement)
  if (has('transaction date') && has('posted date')) return 'capital_one'

  // Discover: "trans. date" / "trans date" + "post date"
  if (h.some(c => /trans\.?\s*date/.test(c)) && any('post date')) return 'discover'

  // Schwab: withdrawal + deposit columns
  if (any('withdrawal', 'withdrawals') && any('deposit', 'deposits')) return 'schwab'

  // Citi credit card: status + debit + credit
  if (has('status') && has('debit') && has('credit')) return 'citi'

  // Bank of America: "running bal" signature column
  if (h.some(c => c.includes('running bal'))) return 'bofa'

  // AmEx: always exports "Extended Details" or "Appears On Your Statement As"
  // Without those, a simple Date+Amount file is generic (signed amounts, not negated)
  if (has('date', 'amount') && any('extended details', 'appears on')) return 'amex'

  return 'generic'
}

// ─── Per-format parsers ───────────────────────────────────────────────────────

function parsePennyPincher(headers: string[], rows: string[][]): Transaction[] {
  const di = colIdx(headers, 'date')
  const mi = colIdx(headers, 'merchant')
  const dsi = colIdx(headers, 'description')
  const ai = colIdx(headers, 'amount')
  const ci = colIdx(headers, 'category')
  const ti = colIdx(headers, 'account type', 'type')
  if (di < 0 || mi < 0 || ai < 0) return []
  return rows.map(r => ({
    date: normalizeDate(r[di] ?? ''),
    merchant: r[mi] ?? '',
    description: dsi >= 0 ? r[dsi] ?? r[mi] ?? '' : r[mi] ?? '',
    amount: parseAmount(r[ai] ?? ''),
    source: 'PennyPincher Export',
    original_category: ci >= 0 ? (r[ci] || 'Other') : 'Other',
    user_category: ci >= 0 ? (r[ci] || 'Other') : undefined,
    type: ti >= 0 ? (r[ti] as AccountType) : undefined,
  }))
}

function parseChase(headers: string[], rows: string[][]): Transaction[] {
  // Headers: Details, Posting Date, Description, Amount, Type, Balance, Check or Slip #
  const di = colIdx(headers, 'posting date', 'transaction date', 'date')
  const mi = colIdx(headers, 'description', 'payee')
  const ai = colIdx(headers, 'amount')
  if (di < 0 || mi < 0 || ai < 0) return []
  return rows.map(r => ({
    date: normalizeDate(r[di] ?? ''),
    merchant: r[mi] ?? '',
    description: r[mi] ?? '',
    // Chase uses negative for debit — matches our convention
    amount: parseAmount(r[ai] ?? ''),
    source: 'Chase',
    original_category: 'Uncategorized',
  }))
}

function parseBofA(headers: string[], rows: string[][]): Transaction[] {
  // Two BofA formats:
  // 1: Date, Description, Amount, Running Bal.
  // 2: Posted Date, Reference Number, Payee, Address, Amount
  const di = colIdx(headers, 'date', 'posted date')
  const mi = colIdx(headers, 'description', 'payee', 'memo')
  const ai = colIdx(headers, 'amount')
  if (di < 0 || mi < 0 || ai < 0) return []
  return rows.map(r => ({
    date: normalizeDate(r[di] ?? ''),
    merchant: r[mi] ?? '',
    description: r[mi] ?? '',
    // BofA: negative = debit  ✓
    amount: parseAmount(r[ai] ?? ''),
    source: 'Bank of America',
    original_category: 'Uncategorized',
  }))
}

function parseCapitalOne(headers: string[], rows: string[][]): Transaction[] {
  // Headers: Transaction Date, Posted Date, Card No., Description, Category, Debit, Credit
  const di = colIdx(headers, 'transaction date', 'date')
  const mi = colIdx(headers, 'description', 'payee')
  const dbi = colIdx(headers, 'debit')
  const cri = colIdx(headers, 'credit')
  const amti = colIdx(headers, 'amount')
  if (di < 0 || mi < 0) return []

  return rows.map(r => {
    let amount = 0
    if (amti >= 0) {
      amount = parseAmount(r[amti] ?? '')
    } else if (dbi >= 0 || cri >= 0) {
      const debit = parseAmount(r[dbi] ?? '')
      const credit = parseAmount(r[cri] ?? '')
      // Debit = money out (negative), Credit = money in (positive)
      amount = credit > 0 ? credit : -debit
    }
    return {
      date: normalizeDate(r[di] ?? ''),
      merchant: r[mi] ?? '',
      description: r[mi] ?? '',
      amount,
      source: 'Capital One',
      original_category: 'Uncategorized',
    }
  })
}

function parseDiscover(headers: string[], rows: string[][]): Transaction[] {
  // Headers: Trans. Date, Post Date, Description, Amount, Category
  const di = colIdx(headers, 'trans. date', 'trans date', 'transaction date', 'date')
  const mi = colIdx(headers, 'description', 'payee')
  const ai = colIdx(headers, 'amount')
  if (di < 0 || mi < 0 || ai < 0) return []
  return rows.map(r => ({
    date: normalizeDate(r[di] ?? ''),
    merchant: r[mi] ?? '',
    description: r[mi] ?? '',
    // Discover: positive = charge → negate to match our convention (negative = spending)
    amount: -parseAmount(r[ai] ?? ''),
    source: 'Discover',
    original_category: 'Uncategorized',
  }))
}

function parseSchwab(headers: string[], rows: string[][]): Transaction[] {
  // Headers: Date, Type, Check #, Description, Withdrawal ($), Deposit ($), RunningBalance ($)
  const di = colIdx(headers, 'date')
  const mi = colIdx(headers, 'description', 'payee', 'memo')
  const wi = colIdx(headers, 'withdrawal', 'withdrawals', 'withdrawal ($)')
  const dpi = colIdx(headers, 'deposit', 'deposits', 'deposit ($)')
  if (di < 0 || mi < 0) return []
  return rows
    .filter(r => r[di] && r[mi])
    .map(r => {
      const withdrawal = parseAmount(r[wi] ?? '')
      const deposit = parseAmount(r[dpi] ?? '')
      const amount = deposit > 0 ? deposit : -withdrawal
      return {
        date: normalizeDate(r[di] ?? ''),
        merchant: r[mi] ?? '',
        description: r[mi] ?? '',
        amount,
        source: 'Schwab',
        original_category: 'Uncategorized',
      }
    })
}

function parseCiti(headers: string[], rows: string[][]): Transaction[] {
  // Headers: Status, Date, Description, Debit, Credit
  const di = colIdx(headers, 'date')
  const mi = colIdx(headers, 'description', 'payee')
  const dbi = colIdx(headers, 'debit')
  const cri = colIdx(headers, 'credit')
  if (di < 0 || mi < 0) return []
  return rows.map(r => {
    const debit = parseAmount(r[dbi] ?? '')
    const credit = parseAmount(r[cri] ?? '')
    const amount = credit > 0 ? credit : -debit
    return {
      date: normalizeDate(r[di] ?? ''),
      merchant: r[mi] ?? '',
      description: r[mi] ?? '',
      amount,
      source: 'Citi',
      original_category: 'Uncategorized',
    }
  })
}

function parseMint(headers: string[], rows: string[][]): Transaction[] {
  // Headers: Date, Description, Original Description, Amount, Transaction Type, Category, Account Name, ...
  const di = colIdx(headers, 'date')
  const mi = colIdx(headers, 'description', 'original description')
  const ai = colIdx(headers, 'amount')
  const tti = colIdx(headers, 'transaction type')
  if (di < 0 || mi < 0 || ai < 0) return []
  return rows.map(r => {
    const raw = parseAmount(r[ai] ?? '')
    const txType = (r[tti] ?? '').toLowerCase()
    // Mint: amount is always positive; transaction type says debit/credit
    const amount = txType === 'credit' ? raw : -raw
    return {
      date: normalizeDate(r[di] ?? ''),
      merchant: r[mi] ?? '',
      description: r[mi] ?? '',
      amount,
      source: 'Mint Export',
      original_category: 'Uncategorized',
    }
  })
}

function parseYNAB(headers: string[], rows: string[][]): Transaction[] {
  // Format 1: Date, Payee, Memo, Amount (signed)
  // Format 2: Account, Flag, Date, Payee, Category, Memo, Outflow, Inflow
  const di = colIdx(headers, 'date')
  const mi = colIdx(headers, 'payee')
  const memi = colIdx(headers, 'memo')
  const ai = colIdx(headers, 'amount')
  const ofi = colIdx(headers, 'outflow')
  const ini = colIdx(headers, 'inflow')
  if (di < 0 || mi < 0) return []
  return rows.map(r => {
    let amount = 0
    if (ai >= 0) {
      amount = parseAmount(r[ai] ?? '')
    } else {
      const out = parseAmount(r[ofi] ?? '')
      const inc = parseAmount(r[ini] ?? '')
      amount = inc > 0 ? inc : -out
    }
    return {
      date: normalizeDate(r[di] ?? ''),
      merchant: r[mi] ?? '',
      description: (memi >= 0 ? r[memi] : r[mi]) ?? '',
      amount,
      source: 'YNAB Export',
      original_category: 'Uncategorized',
    }
  })
}

function parseWellsFargo(rows: string[][]): Transaction[] {
  // No headers: Date, Amount, *, Check#, Description
  return rows
    .filter(r => r.length >= 2 && /\d{1,2}\/\d{1,2}\/\d{4}/.test(r[0]))
    .map(r => ({
      date: normalizeDate(r[0] ?? ''),
      merchant: r[4] || r[3] || r[2] || 'Unknown',
      description: r[4] || r[3] || r[2] || 'Unknown',
      amount: parseAmount(r[1] ?? ''),
      source: 'Wells Fargo',
      original_category: 'Uncategorized',
    }))
}

function parseAmEx(headers: string[], rows: string[][]): Transaction[] {
  const di = colIdx(headers, 'date', 'posted date', 'transaction date')
  const mi = colIdx(headers, 'description', 'payee', 'merchant')
  const ai = colIdx(headers, 'amount')
  if (di < 0 || mi < 0 || ai < 0) return []
  return rows.map(r => ({
    date: normalizeDate(r[di] ?? ''),
    merchant: r[mi] ?? '',
    description: r[mi] ?? '',
    // AmEx: positive = charge → negate
    amount: -parseAmount(r[ai] ?? ''),
    source: 'American Express',
    original_category: 'Uncategorized',
  }))
}

function parseGeneric(headers: string[], rows: string[][]): Transaction[] {
  const di = colIdx(headers, 'date', 'transaction date', 'posted date', 'trans date')
  const mi = colIdx(headers, 'merchant', 'description', 'payee', 'vendor', 'name', 'memo')
  const ai = colIdx(headers, 'amount', 'transaction amount', 'value', 'net amount')
  const dbi = colIdx(headers, 'debit', 'withdrawal', 'money out')
  const cri = colIdx(headers, 'credit', 'deposit', 'money in')

  if (di < 0) throw new Error('Could not find a date column')
  if (mi < 0) throw new Error('Could not find a merchant/description column')
  if (ai < 0 && dbi < 0) throw new Error('Could not find an amount column')

  return rows.map(r => {
    let amount: number
    if (ai >= 0) {
      amount = parseAmount(r[ai] ?? '')
    } else {
      const debit = parseAmount(r[dbi] ?? '')
      const credit = parseAmount(r[cri] ?? '')
      amount = credit > 0 ? credit : -debit
    }
    return {
      date: normalizeDate(r[di] ?? ''),
      merchant: r[mi] ?? '',
      description: r[mi] ?? '',
      amount,
      source: 'CSV Upload',
      original_category: 'Uncategorized',
    }
  })
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function parseCSV(csvContent: string, accountType: AccountType = 'personal'): ParsedCSV {
  const { rows } = parseRows(csvContent)
  if (!rows.length) throw new Error('CSV file is empty')

  const headerIdx = findHeaderIndex(rows)
  const headers = rows[headerIdx]
  const dataRows = rows.slice(headerIdx + 1).filter(r => r.some(c => c.trim()))

  const format = headerIdx === 0 && /^\d{1,2}\/\d{1,2}\/\d{4}/.test(rows[0][0])
    ? 'wells_fargo'
    : detectFormat(headers)

  let transactions: Transaction[] = []

  switch (format) {
    case 'pennypincher':  transactions = parsePennyPincher(headers, dataRows); break
    case 'chase':         transactions = parseChase(headers, dataRows); break
    case 'bofa':          transactions = parseBofA(headers, dataRows); break
    case 'capital_one':   transactions = parseCapitalOne(headers, dataRows); break
    case 'discover':      transactions = parseDiscover(headers, dataRows); break
    case 'schwab':        transactions = parseSchwab(headers, dataRows); break
    case 'citi':          transactions = parseCiti(headers, dataRows); break
    case 'mint':          transactions = parseMint(headers, dataRows); break
    case 'ynab':          transactions = parseYNAB(headers, dataRows); break
    case 'wells_fargo':   transactions = parseWellsFargo(rows); break
    case 'amex':          transactions = parseAmEx(headers, dataRows); break
    default:              transactions = parseGeneric(headers, dataRows); break
  }

  // Filter rows with no valid date or zero amount, then categorize
  transactions = transactions
    .filter(t => t.date && t.merchant && t.amount !== 0)
    .map(t => ({
      ...t,
      // PennyPincher exports keep their categories; all others go through categorizer
      original_category:
        format === 'pennypincher'
          ? (t.original_category || 'Other')
          : categorize(t.merchant, t.description, accountType),
    }))

  return { format, transactions }
}

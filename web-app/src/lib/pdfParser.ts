import type { Transaction, AccountType } from '@/types'
import { normalizeDate, parseAmount } from '@/lib/csvParser'
import { categorize } from '@/lib/categorizer'

interface TextItem {
  str: string
  x: number
  y: number
}

interface ParsedPDF {
  format: 'pdf'
  transactions: Transaction[]
}

// ─── PDF text extraction ──────────────────────────────────────────────────────

async function extractTextItems(buffer: ArrayBuffer): Promise<TextItem[]> {
  // Lazy-load pdfjs so it doesn't bloat the initial bundle
  const pdfjsLib = await import('pdfjs-dist')

  // Use the bundled worker (served as a static asset by Vite)
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString()
  }

  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise
  const items: TextItem[] = []

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()

    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue
      const tx = item.transform
      items.push({
        str: item.str.trim(),
        x: Math.round(tx[4]),
        y: Math.round(tx[5]),
      })
    }
  }

  return items
}

// Group text items into visual rows (items within ±4px Y share a row)
function groupIntoRows(items: TextItem[]): TextItem[][] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x)
  const rows: TextItem[][] = []

  for (const item of sorted) {
    const existing = rows.find(r => Math.abs(r[0].y - item.y) <= 4)
    if (existing) {
      existing.push(item)
      existing.sort((a, b) => a.x - b.x)
    } else {
      rows.push([item])
    }
  }

  return rows
}

// Join items in a row into a single string
function rowText(row: TextItem[]): string {
  return row.map(i => i.str).join(' ')
}

// ─── Wire Transfer Advice (BofA, single-transaction notices) ─────────────────

function parseWireTransferAdvice(rows: TextItem[][]): Transaction[] | null {
  const allText = rows.map(r => rowText(r)).join('\n')

  // Check it's a wire advice
  if (!/wire.*debit|wire.*transfer.*advice/i.test(allText)) return null

  const amountMatch = allText.match(/USD\s*AMOUNT\s*\$?([\d,]+\.\d{2})/i)
  const dateMatch   = allText.match(/DATE:\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i)
  const benefMatch  = allText.match(/BENEFICIARY:\s*([A-Z][A-Z0-9\s\/&'.-]+?)(?:\s{2,}|ID:|$)/im)

  if (!amountMatch || !dateMatch) return null

  const amount  = -parseAmount(amountMatch[1]) // wire debits are expenses
  const date    = normalizeDate(dateMatch[1])
  const merchant = benefMatch ? benefMatch[1].trim() : 'Wire Transfer'

  return [{
    date,
    merchant,
    description: merchant,
    amount,
    source: 'Bank Wire Advice (PDF)',
    original_category: 'Transfer',
  }]
}

// ─── Statement table parser (WF, BofA, Chase layouts) ────────────────────────

// Date patterns we treat as the start of a transaction row
const DATE_RE = /^(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)$/

function inferYear(dateStr: string, statementYear: number): string {
  // WF uses M/D without year; infer from statement
  if (/^\d{1,2}\/\d{1,2}$/.test(dateStr)) return `${dateStr}/${statementYear}`
  return dateStr
}

function parseStatementTable(rows: TextItem[][], source: string): Transaction[] {
  const transactions: Transaction[] = []

  // Find the header row — must contain "date" and ("deposit" or "withdrawal" or "amount")
  let headerRowIdx = -1
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const text = rowText(rows[i]).toLowerCase()
    const hasDate = /\bdate\b/.test(text)
    const hasAmt  = /deposit|withdrawal|amount|addition|subtraction|credit|debit/.test(text)
    if (hasDate && hasAmt) { headerRowIdx = i; break }
  }

  if (headerRowIdx < 0) return []

  const headerRow = rows[headerRowIdx]

  // Determine column X boundaries from header items
  // Look for deposit/addition/credit (income) and withdrawal/subtraction/debit (expense) headers
  let depositX = -1, withdrawalX = -1, amountX = -1

  for (const item of headerRow) {
    const t = item.str.toLowerCase()
    if (/deposit|addition|credit/.test(t))      depositX    = item.x
    if (/withdrawal|subtraction|debit/.test(t)) withdrawalX = item.x
    if (/^amount$/i.test(t))                     amountX     = item.x
  }

  // Infer statement year from nearby text or default to current year
  const allText = rows.map(r => rowText(r)).join(' ')
  const yearMatch = allText.match(/\b(20\d{2})\b/)
  const statementYear = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear()

  // Accumulate transaction rows — a transaction may span multiple PDF rows
  // (description text wraps to the next line in the PDF)
  let pendingDate = ''
  let pendingDesc: string[] = []
  let pendingAmount = 0
  let pendingIsSet = false

  const flush = () => {
    if (!pendingIsSet || !pendingDate || pendingAmount === 0) return
    const merchant = pendingDesc.join(' ').trim()
    if (merchant) {
      transactions.push({
        date: normalizeDate(pendingDate),
        merchant,
        description: merchant,
        amount: pendingAmount,
        source,
        original_category: 'Uncategorized',
      })
    }
    pendingDate = ''
    pendingDesc = []
    pendingAmount = 0
    pendingIsSet = false
  }

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i]
    const text = rowText(row).trim()

    // Skip empty rows and footer/summary rows
    if (!text || /^total|ending balance|beginning balance|totals/i.test(text)) {
      flush()
      continue
    }

    // Check if first item in row looks like a date
    const firstItem = row[0]
    const dateStr   = firstItem?.str.trim() ?? ''
    const isDateRow = DATE_RE.test(dateStr)

    if (isDateRow) {
      flush() // commit previous transaction

      const dateWithYear = inferYear(dateStr, statementYear)
      pendingDate  = dateWithYear
      pendingIsSet = true
      pendingAmount = 0

      // Gather non-date, non-numeric-only items as description candidates
      // Also pick up amounts from this row
      for (const item of row.slice(1)) {
        const s   = item.str.trim()
        const amt = parseAmount(s)

        if (s === '' || /^[-–]$/.test(s)) continue

        if (amt !== 0 && /^-?[\d,]+\.\d{2}$/.test(s.replace(/[$\s]/g, ''))) {
          // It's an amount — determine sign from column position
          if (depositX >= 0 && withdrawalX >= 0) {
            const nearDeposit    = Math.abs(item.x - depositX) < Math.abs(item.x - withdrawalX)
            pendingAmount = nearDeposit ? Math.abs(amt) : -Math.abs(amt)
          } else if (amountX >= 0) {
            pendingAmount = amt
          } else {
            // No header positions; keep as-is (signed)
            pendingAmount = amt
          }
        } else if (!/^\d+$/.test(s)) {
          // Not a pure integer (like a check number) — it's description text
          pendingDesc.push(s)
        }
      }
    } else {
      // Continuation row — might be wrapped description text or additional amounts
      if (!pendingIsSet) continue

      for (const item of row) {
        const s   = item.str.trim()
        const amt = parseAmount(s)

        if (s === '' || /^[-–]$/.test(s)) continue

        if (amt !== 0 && /^-?[\d,]+\.\d{2}$/.test(s.replace(/[$\s]/g, ''))) {
          if (pendingAmount === 0) {
            if (depositX >= 0 && withdrawalX >= 0) {
              const nearDeposit = Math.abs(item.x - depositX) < Math.abs(item.x - withdrawalX)
              pendingAmount = nearDeposit ? Math.abs(amt) : -Math.abs(amt)
            } else {
              pendingAmount = amt
            }
          }
        } else if (!/^\d+$/.test(s) && !DATE_RE.test(s)) {
          pendingDesc.push(s)
        }
      }
    }
  }

  flush() // final row

  return transactions.filter(t => t.amount !== 0)
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function parsePDF(
  buffer: ArrayBuffer,
  accountType: AccountType = 'personal'
): Promise<ParsedPDF> {
  const items = await extractTextItems(buffer)

  if (items.length === 0) {
    throw new Error('pdf format is not supported. Try a CSV format file export from your bank instead.')
  }

  const rows = groupIntoRows(items)

  // Try wire transfer advice first (single-transaction notices)
  const wireTxns = parseWireTransferAdvice(rows)
  if (wireTxns && wireTxns.length > 0) {
    const txns = wireTxns.map(t => ({
      ...t,
      original_category: categorize(t.merchant, t.description, accountType),
    }))
    return { format: 'pdf', transactions: txns }
  }

  // Detect bank name for source label
  const allText = rows.map(r => rowText(r)).join(' ')
  let source = 'Bank Statement (PDF)'
  if (/wells fargo/i.test(allText))    source = 'Wells Fargo (PDF)'
  else if (/bank of america/i.test(allText)) source = 'Bank of America (PDF)'
  else if (/chase/i.test(allText))     source = 'Chase (PDF)'
  else if (/citi/i.test(allText))      source = 'Citi (PDF)'
  else if (/american express/i.test(allText)) source = 'American Express (PDF)'

  const txns = parseStatementTable(rows, source)

  if (txns.length === 0) {
    throw new Error('pdf format is not supported. Try a CSV format file export from your bank instead.')
  }

  return {
    format: 'pdf',
    transactions: txns.map(t => ({
      ...t,
      original_category: categorize(t.merchant, t.description, accountType),
    })),
  }
}

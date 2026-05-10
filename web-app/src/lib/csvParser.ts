import type { Transaction, AccountType } from '@/types'
import { categorize } from '@/lib/categorizer'

export type BankFormat = 'wells_fargo' | 'amex' | 'generic' | 'credit_card'

interface ParsedCSV {
  format: BankFormat
  transactions: Transaction[]
}

function detectFormat(rows: string[][]): BankFormat {
  if (rows.length < 1) return 'generic'

  const firstRow = rows[0]
  const headerStr = firstRow.join(',').toLowerCase()

  // Credit card format: Status, Date, Description, Debit, Credit, Member Name
  if (headerStr.includes('status') && headerStr.includes('debit') && headerStr.includes('credit')) {
    return 'credit_card'
  }

  // Check for headers first
  if (headerStr.includes('date') && headerStr.includes('amount')) {
    if (headerStr.includes('reference') || headerStr.includes('payee')) {
      return 'amex'
    }
    if (headerStr.includes('description')) {
      return 'amex'
    }
  }

  // Wells Fargo format: date, amount, *, check_number, description (no headers, quoted)
  // First row has date in format MM/DD/YYYY and amount
  if (
    firstRow.length >= 2 &&
    /\d{1,2}\/\d{1,2}\/\d{4}/.test(firstRow[0]) &&
    !isNaN(parseFloat(firstRow[1]))
  ) {
    return 'wells_fargo'
  }

  return 'generic'
}

function parseWellsFargo(rows: string[][]): Transaction[] {
  if (rows.length === 0) return []

  return rows
    .filter((row) => row.length >= 2 && row[0] && row[1])
    .map((row) => {
      const [date, amountStr, , checkNum, description] = row
      const amount = parseFloat(amountStr) || 0

      return {
        date: date || '',
        description: description || checkNum || 'Transfer',
        merchant: description || checkNum || 'Transfer',
        amount,
        source: 'Wells Fargo',
        original_category: 'Uncategorized',
      }
    })
}

function parseAmEx(rows: string[][]): Transaction[] {
  if (rows.length < 2) return []

  const headers = rows[0].map((h) => h.toLowerCase().trim())
  const dateIdx = headers.findIndex((h) =>
    ['date', 'posted date'].includes(h),
  )
  const descIdx = headers.findIndex((h) =>
    ['description', 'payee'].includes(h),
  )
  const amountIdx = headers.findIndex((h) => h === 'amount')

  if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
    return []
  }

  return rows
    .slice(1)
    .filter((row) => row.length > Math.max(dateIdx, descIdx, amountIdx))
    .map((row) => {
      const date = row[dateIdx] || ''
      const description = row[descIdx] || ''
      const amountStr = row[amountIdx] || '0'
      const amount = parseFloat(amountStr.replace(/[$,]/g, '')) || 0

      return {
        date,
        merchant: description,
        description,
        amount,
        source: 'American Express',
        original_category: 'Uncategorized',
      }
    })
}

function parseCreditCard(rows: string[][]): Transaction[] {
  if (rows.length < 2) return []

  const headers = rows[0].map((h) => h.toLowerCase().trim())
  const dateIdx = headers.findIndex((h) => h === 'date')
  const descIdx = headers.findIndex((h) => h === 'description')
  const debitIdx = headers.findIndex((h) => h === 'debit')
  const creditIdx = headers.findIndex((h) => h === 'credit')

  if (dateIdx === -1 || descIdx === -1 || debitIdx === -1 || creditIdx === -1) {
    return []
  }

  return rows
    .slice(1)
    .filter((row) => row.length > Math.max(dateIdx, descIdx, debitIdx, creditIdx))
    .map((row) => {
      const date = row[dateIdx] || ''
      const description = row[descIdx] || ''
      const debitStr = row[debitIdx] || ''
      const creditStr = row[creditIdx] || ''

      // Debit is negative (money out), Credit is positive (money in)
      let amount = 0
      if (debitStr) {
        amount = -(parseFloat(debitStr.replace(/[$,]/g, '')) || 0)
      } else if (creditStr) {
        amount = parseFloat(creditStr.replace(/[$,]/g, '')) || 0
      }

      return {
        date,
        merchant: description,
        description,
        amount,
        source: 'Credit Card',
        original_category: 'Uncategorized',
      }
    })
}

function parseGeneric(rows: string[][]): Transaction[] {
  if (rows.length < 2) return []

  const headers = rows[0].map((h) => h.toLowerCase().trim())
  const dateIdx = headers.findIndex((h) =>
    ['date', 'transaction date', 'posted date', 'posted date'].includes(h),
  )
  const merchantIdx = headers.findIndex((h) =>
    ['merchant', 'description', 'payee', 'vendor'].includes(h),
  )
  const amountIdx = headers.findIndex((h) =>
    ['amount', 'transaction amount', 'value'].includes(h),
  )

  if (dateIdx === -1 || merchantIdx === -1 || amountIdx === -1) {
    throw new Error(
      'Could not find required columns (date, merchant/description, amount)',
    )
  }

  return rows
    .slice(1)
    .filter((row) => row.length > Math.max(dateIdx, merchantIdx, amountIdx))
    .map((row) => {
      const date = row[dateIdx] || ''
      const merchant = row[merchantIdx] || ''
      const amountStr = row[amountIdx] || '0'
      const amount = parseFloat(amountStr.replace(/[$,]/g, '')) || 0

      return {
        date,
        merchant,
        description: merchant,
        amount,
        source: 'CSV Upload',
        original_category: 'Uncategorized',
      }
    })
}

function parseCSVString(csvContent: string): string[][] {
  const lines = csvContent
    .trim()
    .split('\n')
    .filter((line) => line.trim())

  return lines.map((line) => {
    const result: string[] = []
    let current = ''
    let insideQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const nextChar = line[i + 1]

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          current += '"'
          i++ // Skip next quote
        } else {
          insideQuotes = !insideQuotes
        }
      } else if (char === ',' && !insideQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }

    result.push(current.trim())
    return result
  })
}

export function parseCSV(csvContent: string, accountType: AccountType = 'personal'): ParsedCSV {
  const rows = parseCSVString(csvContent)

  if (rows.length === 0) {
    throw new Error('CSV file is empty')
  }

  const format = detectFormat(rows)

  let transactions: Transaction[] = []

  switch (format) {
    case 'wells_fargo':
      transactions = parseWellsFargo(rows)
      break
    case 'amex':
      transactions = parseAmEx(rows)
      break
    case 'credit_card':
      transactions = parseCreditCard(rows)
      break
    case 'generic':
      transactions = parseGeneric(rows)
      break
  }

  // Filter invalid, then categorize
  transactions = transactions
    .filter((t) => t.date && t.merchant && t.amount !== 0)
    .map((t) => ({
      ...t,
      original_category: categorize(t.merchant, t.description, accountType),
    }))

  return { format, transactions }
}

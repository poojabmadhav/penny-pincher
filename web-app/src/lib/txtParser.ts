import type { Transaction, AccountType } from '@/types'
import { normalizeDate, parseAmount } from '@/lib/csvParser'
import { categorize } from '@/lib/categorizer'

interface ParsedTXT {
  format: 'txt'
  transactions: Transaction[]
}

// Matches: MM/DD/YYYY  <description>  <amount>  <running_balance>
// The description can contain spaces and numbers, but we only want the LAST two
// decimal numbers on the line as amount + running balance.
const TX_LINE = /^(\d{1,2}\/\d{1,2}\/\d{4})\s{2,}(.*?)\s{3,}(-?[\d,]+\.\d{2})\s+(-?[\d,]+\.\d{2})\s*$/

export function parseTXT(content: string, accountType: AccountType = 'personal'): ParsedTXT {
  const lines = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')

  const transactions: Transaction[] = []

  for (const line of lines) {
    const m = line.match(TX_LINE)
    if (!m) continue

    const date = normalizeDate(m[1])
    const merchant = m[2].trim()
    // m[3] = transaction amount, m[4] = running balance (ignored)
    const amount = parseAmount(m[3])

    if (!date || !merchant || amount === 0) continue

    transactions.push({
      date,
      merchant,
      description: merchant,
      amount,
      source: 'Bank Statement (TXT)',
      original_category: categorize(merchant, merchant, accountType),
    })
  }

  if (transactions.length === 0) {
    throw new Error(
      'No transactions found. Expected lines starting with MM/DD/YYYY followed by a description and amount.'
    )
  }

  return { format: 'txt', transactions }
}

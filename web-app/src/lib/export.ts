import type { Transaction } from '@/types'
import { calculateCategoryMetrics, getMonthlyIncomeAndSpending } from '@/lib/analytics'

function escapeCsv(value: string | number): string {
  const str = String(value)
  return str.includes(',') || str.includes('"') || str.includes('\n')
    ? `"${str.replace(/"/g, '""')}"`
    : str
}

function row(...fields: (string | number)[]): string {
  return fields.map(escapeCsv).join(',')
}

function commentRow(...fields: (string | number)[]): string {
  return '# ' + fields.map(escapeCsv).join(',')
}

/**
 * Exports everything in one file:
 * - Transactions section (re-importable, categories preserved)
 * - Summary section prefixed with # (ignored by the parser on re-upload)
 */
export function exportAllCsv(transactions: Transaction[]): void {
  const lines: string[] = []
  const date = new Date().toISOString().split('T')[0]

  // ── Transactions (re-importable) ───────────────────────────────────────────
  lines.push(`# PennyPincher Export — ${date}`)
  lines.push(`# Re-upload this file at any time to restore your data.`)
  lines.push(`# Lines starting with # are ignored on import.`)
  lines.push(row('Date', 'Merchant', 'Description', 'Amount', 'Category', 'Account Type'))

  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )
  for (const tx of sorted) {
    lines.push(
      row(
        tx.date,
        tx.merchant,
        tx.description,
        tx.amount,
        tx.user_category || tx.original_category || 'Other',
        tx.type || 'personal',
      ),
    )
  }

  // ── Summary (human-readable, not imported) ────────────────────────────────
  lines.push('#')
  lines.push('# ── MONTHLY CASH FLOW ───────────────────────────────────')
  lines.push(commentRow('Month', 'Income', 'Expenses', 'Net', 'Savings Rate', 'Transactions'))

  const monthly = getMonthlyIncomeAndSpending(transactions)
  let totalIncome = 0
  let totalExpenses = 0

  for (const m of monthly) {
    const net = m.income - m.spending
    const rate = m.income > 0 ? `${((net / m.income) * 100).toFixed(1)}%` : 'N/A'
    const txCount = transactions.filter((tx) => {
      const d = new Date(tx.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return key === m.monthKey
    }).length
    lines.push(commentRow(m.month, m.income.toFixed(2), m.spending.toFixed(2), net.toFixed(2), rate, txCount))
    totalIncome += m.income
    totalExpenses += m.spending
  }

  const totalNet = totalIncome - totalExpenses
  const totalRate = totalIncome > 0 ? `${((totalNet / totalIncome) * 100).toFixed(1)}%` : 'N/A'
  lines.push(commentRow('TOTAL', totalIncome.toFixed(2), totalExpenses.toFixed(2), totalNet.toFixed(2), totalRate, transactions.length))

  lines.push('#')
  lines.push('# ── SPENDING BY CATEGORY ────────────────────────────────')
  lines.push(commentRow('Category', 'Total', 'Transactions', '% of Spending', 'Avg Transaction'))

  const metrics = calculateCategoryMetrics(transactions)
  for (const m of metrics) {
    lines.push(
      commentRow(
        m.category,
        m.total.toFixed(2),
        m.count,
        `${m.percentOfTotal.toFixed(1)}%`,
        m.average.toFixed(2),
      ),
    )
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `pennypincher_${date}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

import type { Transaction } from '@/types'

export interface CategoryMetrics {
  category: string
  total: number
  count: number
  average: number
  percentOfTotal: number
}

export interface MonthlySpending {
  month: string
  total: number
}

export interface CategoryInsight {
  category: string
  total: number
  insight: string
}

export function filterTransactionsByDateRange(
  transactions: Transaction[],
  startDate: string,
  endDate: string,
): Transaction[] {
  return transactions.filter((tx) => {
    const txDate = new Date(tx.date)
    const start = new Date(startDate)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)
    return txDate >= start && txDate <= end
  })
}

export function calculateCategoryMetrics(transactions: Transaction[]): CategoryMetrics[] {
  const categoryMap = new Map<string, { total: number; count: number }>()

  transactions.forEach((tx) => {
    if (tx.amount < 0) {
      const cat = tx.original_category || 'Uncategorized'
      const current = categoryMap.get(cat) || { total: 0, count: 0 }
      categoryMap.set(cat, {
        total: current.total + Math.abs(tx.amount),
        count: current.count + 1,
      })
    }
  })

  const totalSpent = Array.from(categoryMap.values()).reduce((sum, v) => sum + v.total, 0)

  return Array.from(categoryMap.entries())
    .map(([category, { total, count }]) => ({
      category,
      total,
      count,
      average: total / count,
      percentOfTotal: totalSpent > 0 ? (total / totalSpent) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total)
}

export function getMonthlySpendingTrend(transactions: Transaction[]): MonthlySpending[] {
  const monthMap = new Map<string, number>()

  transactions.forEach((tx) => {
    if (tx.amount < 0) {
      const date = new Date(tx.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const current = monthMap.get(monthKey) || 0
      monthMap.set(monthKey, current + Math.abs(tx.amount))
    }
  })

  return Array.from(monthMap.entries())
    .map(([month, total]) => ({
      month: formatMonthLabel(month),
      total,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1)
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

export function generateCategoryInsights(
  categoryMetrics: CategoryMetrics[],
  allTransactions: Transaction[],
): CategoryInsight[] {
  return categoryMetrics.map((cat) => {
    const categoryTxs = allTransactions.filter(
      (tx) => tx.original_category === cat.category && tx.amount < 0,
    )
    const insight = generateInsightForCategory(cat, categoryMetrics, categoryTxs)
    return {
      category: cat.category,
      total: cat.total,
      insight,
    }
  })
}

function generateInsightForCategory(
  category: CategoryMetrics,
  allCategories: CategoryMetrics[],
  categoryTransactions: Transaction[],
): string {
  const rank = allCategories.findIndex((c) => c.category === category.category) + 1

  if (categoryTransactions.length === 0) return ''

  // Top 3
  if (rank <= 3) {
    return `#${rank} spender (${category.count} txns)`
  }

  // Check for spikes (highest transaction)
  const maxTransaction = Math.max(...categoryTransactions.map((t) => Math.abs(t.amount)))
  if (maxTransaction > category.total * 0.3) {
    return `Large transaction: $${maxTransaction.toFixed(0)}`
  }

  // Frequency insight
  if (category.count > 15) {
    return `Frequent (${category.count} txns)`
  }

  // Average transaction
  if (category.average > 500) {
    return `High avg: $${category.average.toFixed(0)}/txn`
  }

  return ''
}

export interface MonthlyTrend {
  monthKey: string
  month: string
  income: number
  spending: number
}

export interface CashFlowSummary {
  income: number
  expenses: number
  net: number
  savingsRate: number
}

export function getMonthlyIncomeAndSpending(transactions: Transaction[]): MonthlyTrend[] {
  const monthMap = new Map<string, { income: number; spending: number }>()

  transactions.forEach((tx) => {
    const date = new Date(tx.date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, { income: 0, spending: 0 })
    }
    const entry = monthMap.get(monthKey)!
    if (tx.amount > 0) {
      entry.income += tx.amount
    } else {
      entry.spending += Math.abs(tx.amount)
    }
  })

  return Array.from(monthMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([monthKey, { income, spending }]) => ({
      monthKey,
      month: formatMonthLabel(monthKey),
      income,
      spending,
    }))
}

export function calculateCashFlowSummary(transactions: Transaction[]): CashFlowSummary {
  let income = 0
  let expenses = 0

  transactions.forEach((tx) => {
    if (tx.amount > 0) {
      income += tx.amount
    } else {
      expenses += Math.abs(tx.amount)
    }
  })

  const net = income - expenses
  const savingsRate = income > 0 ? (net / income) * 100 : 0

  return { income, expenses, net, savingsRate }
}

export function getDateRangeForSelection(
  selection: 'this-month' | 'year-to-date' | 'all-data' | 'custom',
  startDate?: string,
  endDate?: string,
  selectedYear?: number,
): { start: string; end: string } {
  const today = new Date()

  // year === 0 is the sentinel for "All Years" (no year filter)
  const allYears = !selectedYear || selectedYear === 0

  switch (selection) {
    case 'this-month': {
      const year = allYears ? today.getFullYear() : selectedYear!
      const firstDay = new Date(year, today.getMonth(), 1)
      const lastDay = new Date(year, today.getMonth() + 1, 0)
      return {
        start: firstDay.toISOString().split('T')[0],
        end: lastDay.toISOString().split('T')[0],
      }
    }

    case 'year-to-date': {
      const year = allYears ? today.getFullYear() : selectedYear!
      const start = new Date(year, 0, 1)
      const end = year === today.getFullYear() ? today : new Date(year, 11, 31)
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      }
    }

    case 'all-data': {
      if (allYears) {
        return { start: '2000-01-01', end: today.toISOString().split('T')[0] }
      }
      const year = selectedYear!
      return {
        start: `${year}-01-01`,
        end: year === today.getFullYear()
          ? today.toISOString().split('T')[0]
          : `${year}-12-31`,
      }
    }

    case 'custom':
      return {
        start: startDate || '2000-01-01',
        end: endDate || today.toISOString().split('T')[0],
      }

    default:
      return { start: '2000-01-01', end: today.toISOString().split('T')[0] }
  }
}

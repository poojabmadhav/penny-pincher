import type { FileRecord, AnalysisResult, Transaction, CategoryData, Trend, Insight } from '@/types'
import { isSpendingCategory } from '@/lib/categorizer'

export interface MonthlyConsolidation {
  month: string // YYYY-MM format
  monthLabel: string // "September 2024"
  fileCount: number
  sourceFiles: string[]
  analysisResult: AnalysisResult
}

function getMonthKey(dateStr: string): string {
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function getMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1, 1)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function getTrend(transactions: Transaction[]): Trend {
  if (transactions.length < 2) return 'insufficient_data'

  const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const mid = Math.floor(sorted.length / 2)
  const firstHalf = sorted.slice(0, mid).reduce((sum, t) => sum + Math.abs(t.amount), 0) / mid
  const secondHalf = sorted.slice(mid).reduce((sum, t) => sum + Math.abs(t.amount), 0) / (sorted.length - mid)

  if (secondHalf > firstHalf * 1.1) return 'up'
  if (secondHalf < firstHalf * 0.9) return 'down'
  return 'stable'
}

export function consolidateByMonth(fileHistory: FileRecord[]): MonthlyConsolidation[] {
  const monthMap = new Map<string, { files: FileRecord[], transactions: Transaction[] }>()

  // Group by month
  fileHistory.forEach((record) => {
    if (!record.analysisResult) return

    record.analysisResult.transactions?.forEach((tx) => {
      const monthKey = getMonthKey(tx.date)
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { files: [], transactions: [] })
      }
      const entry = monthMap.get(monthKey)!
      if (!entry.files.includes(record)) {
        entry.files.push(record)
      }
      entry.transactions.push(tx)
    })
  })

  // Sort by month (newest first)
  const sorted = Array.from(monthMap.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))

  return sorted.map(([monthKey, { files, transactions }]) => {
    // Only count actual spending (exclude transfers, payroll, credits)
    const spendingTxs = transactions.filter((tx) => {
      const cat = tx.user_category || tx.original_category || 'Other'
      return isSpendingCategory(cat)
    })

    const totalSpent = spendingTxs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
    const avgTransaction = spendingTxs.length > 0 ? totalSpent / spendingTxs.length : 0

    // Build category breakdown — spending categories only
    const byCategory: Record<string, CategoryData> = {}
    spendingTxs.forEach((tx) => {
      const category = tx.user_category || tx.original_category || 'Other'
      if (!byCategory[category]) {
        byCategory[category] = {
          total: 0,
          count: 0,
          average_transaction: 0,
          trend: 'stable',
          top_merchants: [],
        }
      }
      byCategory[category].total += Math.abs(tx.amount)
      byCategory[category].count += 1
    })

    // Calculate trends and top merchants per category
    Object.entries(byCategory).forEach(([category, data]) => {
      data.average_transaction = data.count > 0 ? data.total / data.count : 0
      const categoryTransactions = transactions.filter(
        (tx) => (tx.user_category || tx.original_category || 'Uncategorized') === category,
      )
      data.trend = getTrend(categoryTransactions)

      // Get top merchants
      const merchantMap = new Map<string, number>()
      categoryTransactions.forEach((tx) => {
        merchantMap.set(tx.merchant, (merchantMap.get(tx.merchant) ?? 0) + tx.amount)
      })
      data.top_merchants = Array.from(merchantMap.entries())
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .slice(0, 3)
        .map(([merchant, total]) => ({ merchant, total }))
    })

    // Generate insights
    const insights = generateInsights(spendingTxs, byCategory)

    // Generate anomalies from spending only
    const anomalies = generateAnomalies(spendingTxs)

    // Top merchants from spending transactions
    const merchantMap = new Map<string, { total: number; count: number }>()
    spendingTxs.forEach((tx) => {
      if (!merchantMap.has(tx.merchant)) {
        merchantMap.set(tx.merchant, { total: 0, count: 0 })
      }
      const m = merchantMap.get(tx.merchant)!
      m.total += Math.abs(tx.amount)
      m.count += 1
    })
    const topMerchants = Array.from(merchantMap.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .map(([merchant, { total, count }]) => ({ merchant, total, count }))

    const dateRange = spendingTxs.length > 0
      ? (() => {
          const dates = spendingTxs.map((tx) => new Date(tx.date).getTime()).sort((a, b) => a - b)
          const minDate = new Date(dates[0]).toLocaleDateString()
          const maxDate = new Date(dates[dates.length - 1]).toLocaleDateString()
          return `${minDate} to ${maxDate}`
        })()
      : 'No data'

    const analysisResult: AnalysisResult = {
      status: 'success',
      account_type: files[0]?.accountType || 'personal',
      summary: {
        total_spent: totalSpent,
        transaction_count: spendingTxs.length,
        date_range: dateRange,
        average_transaction: avgTransaction,
      },
      by_category: byCategory,
      insights,
      anomalies,
      top_merchants: topMerchants,
      transactions,
    }

    return {
      month: monthKey,
      monthLabel: getMonthLabel(monthKey),
      fileCount: files.length,
      sourceFiles: files.map((f) => f.fileName),
      analysisResult,
    }
  })
}

function fmt(amount: number): string {
  return `$${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function isAmazon(merchant: string): boolean {
  return /amazon|amz\b/i.test(merchant)
}

function generateInsights(transactions: Transaction[], byCategory: Record<string, CategoryData>): Insight[] {
  const insights: Insight[] = []

  // Detect sign convention: Wells Fargo uses negative for debits, AmEx uses positive
  // Use all non-zero transactions for spend analysis
  const spend = transactions.filter((t) => t.amount !== 0)
  const totalSpend = spend.reduce((s, t) => s + Math.abs(t.amount), 0)

  if (spend.length === 0) return insights

  // --- Recurring charges: same merchant 2+ times with consistent amounts ---
  const merchantGroups = new Map<string, { amounts: number[]; displayName: string }>()
  spend.forEach((tx) => {
    const key = tx.merchant.toLowerCase().trim()
    if (!merchantGroups.has(key)) merchantGroups.set(key, { amounts: [], displayName: tx.merchant })
    merchantGroups.get(key)!.amounts.push(Math.abs(tx.amount))
  })

  merchantGroups.forEach(({ amounts, displayName }) => {
    if (amounts.length < 2) return
    const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length
    if (avg < 1) return // skip tiny amounts
    const allClose = amounts.every((a) => Math.abs(a - avg) / avg < 0.15)
    if (allClose) {
      insights.push({
        type: 'recurring',
        message: `Recurring charge: ${displayName}`,
        detail: `Charged ${amounts.length}× this month — ${fmt(avg)} each`,
        amount: -(avg * amounts.length),
      })
    }
  })

  // --- Category spike: any named category over 40% of total (skip Uncategorized) ---
  Object.entries(byCategory)
    .filter(([category, data]) => category !== 'Uncategorized' && Math.abs(data.total) / totalSpend > 0.4)
    .sort((a, b) => Math.abs(b[1].total) - Math.abs(a[1].total))
    .slice(0, 2)
    .forEach(([category, data]) => {
      const pct = Math.round((Math.abs(data.total) / totalSpend) * 100)
      insights.push({
        type: 'category_spike',
        message: `${category} is ${pct}% of your spending this month`,
        detail: `${data.count} transaction${data.count !== 1 ? 's' : ''} totalling ${fmt(data.total)}`,
        amount: data.total,
      })
    })

  // --- Unusual charges: a single charge > 3× that merchant's own average ---
  merchantGroups.forEach(({ amounts, displayName }) => {
    if (amounts.length < 2) return
    const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length
    amounts.forEach((amount) => {
      if (amount > avg * 3) {
        insights.push({
          type: 'unusual',
          message: `Unusual charge at ${displayName}`,
          detail: `${fmt(amount)} — over 3× your typical ${fmt(avg)} there`,
          amount: -amount,
        })
      }
    })
  })

  // --- Amazon tracker ---
  const amazonTxs = spend.filter((tx) => isAmazon(tx.merchant))
  if (amazonTxs.length > 0) {
    const amazonTotal = amazonTxs.reduce((s, t) => s + Math.abs(t.amount), 0)
    const pct = Math.round((amazonTotal / totalSpend) * 100)
    insights.push({
      type: 'amazon',
      message: `Amazon: ${amazonTxs.length} order${amazonTxs.length !== 1 ? 's' : ''} totalling ${fmt(amazonTotal)}`,
      detail: `${pct}% of your total spend this month`,
      amount: -amazonTotal,
    })
  }

  return insights
}

function generateAnomalies(transactions: Transaction[]) {
  const amounts = transactions.map((t) => Math.abs(t.amount)).sort((a, b) => a - b)
  const median = amounts[Math.floor(amounts.length / 2)]
  const threshold = median * 2.5 // Transactions 2.5x the median

  return transactions
    .filter((tx) => Math.abs(tx.amount) > threshold)
    .slice(0, 5)
    .map((tx) => ({
      date: tx.date,
      merchant: tx.merchant,
      amount: tx.amount,
      category: tx.user_category || tx.original_category || 'Uncategorized',
      description: tx.description,
      reason: 'High transaction amount',
    }))
}

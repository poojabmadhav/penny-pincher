import type { FileRecord, AnalysisResult, Transaction, CategoryData, Trend } from '@/types'

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
    const totalSpent = transactions.reduce((sum, tx) => sum + tx.amount, 0)
    const avgTransaction = transactions.length > 0 ? totalSpent / transactions.length : 0

    // Build category breakdown
    const byCategory: Record<string, CategoryData> = {}
    transactions.forEach((tx) => {
      const category = tx.user_category || tx.original_category || 'Uncategorized'
      if (!byCategory[category]) {
        byCategory[category] = {
          total: 0,
          count: 0,
          average_transaction: 0,
          trend: 'stable',
          top_merchants: [],
        }
      }
      byCategory[category].total += tx.amount
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
    const insights = generateInsights(transactions, byCategory)

    // Generate anomalies
    const anomalies = generateAnomalies(transactions)

    // Top merchants overall
    const merchantMap = new Map<string, { total: number; count: number }>()
    transactions.forEach((tx) => {
      if (!merchantMap.has(tx.merchant)) {
        merchantMap.set(tx.merchant, { total: 0, count: 0 })
      }
      const m = merchantMap.get(tx.merchant)!
      m.total += tx.amount
      m.count += 1
    })
    const topMerchants = Array.from(merchantMap.entries())
      .sort((a, b) => Math.abs(b[1].total) - Math.abs(a[1].total))
      .slice(0, 5)
      .map(([merchant, { total, count }]) => ({ merchant, total, count }))

    const dateRange = transactions.length > 0
      ? (() => {
          const dates = transactions.map((tx) => new Date(tx.date).getTime()).sort((a, b) => a - b)
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
        transaction_count: transactions.length,
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

function generateInsights(transactions: Transaction[], byCategory: Record<string, CategoryData>): string[] {
  const insights: string[] = []

  // Top spending category
  const topCategory = Object.entries(byCategory).sort((a, b) => Math.abs(b[1].total) - Math.abs(a[1].total))[0]
  if (topCategory) {
    const pct = ((Math.abs(topCategory[1].total) / Math.abs(Object.values(byCategory).reduce((sum, c) => sum + c.total, 0))) * 100).toFixed(0)
    insights.push(`Top spending category: ${topCategory[0]} (${pct}%)`)
  }

  // Transaction count
  insights.push(`Total transactions: ${transactions.length}`)

  // Average transaction
  const avgTx = Object.values(byCategory).reduce((sum, c) => sum + c.count, 0) > 0
    ? Math.abs(Object.values(byCategory).reduce((sum, c) => sum + c.total, 0)) / Object.values(byCategory).reduce((sum, c) => sum + c.count, 0)
    : 0
  insights.push(`Average transaction: $${avgTx.toFixed(2)}`)

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

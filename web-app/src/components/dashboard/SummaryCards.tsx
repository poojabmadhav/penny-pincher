import type { AnalysisResult, AccountType } from '@/types'
import { formatCurrency, formatDateRange } from '@/lib/format'

interface SummaryCardsProps {
  summary: AnalysisResult['summary']
  byCategory: AnalysisResult['by_category']
  accountType: AccountType
}

export default function SummaryCards({
  summary,
  byCategory,
  accountType,
}: SummaryCardsProps) {
  const topCategory = Object.entries(byCategory)
    .sort((a, b) => Math.abs(b[1].total) - Math.abs(a[1].total))
    .at(0)?.[0]

  const cards = [
    {
      label: 'Total Spent',
      value: formatCurrency(summary.total_spent),
      subtext: `${accountType} account`,
      color: 'text-brand-mid',
    },
    {
      label: 'Transactions',
      value: summary.transaction_count.toString(),
      subtext: `avg ${formatCurrency(summary.average_transaction)}`,
      color: 'text-gray-600',
    },
    {
      label: 'Date Range',
      value: formatDateRange(summary.date_range),
      subtext: `${summary.transaction_count} transactions`,
      color: 'text-gray-600',
    },
    {
      label: 'Top Category',
      value: topCategory || 'N/A',
      subtext: topCategory
        ? `${formatCurrency(byCategory[topCategory].total)} spent`
        : 'No data',
      color: 'text-brand-mid',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 hover:shadow-md transition-shadow"
        >
          <p className="text-sm text-gray-500 font-medium">{card.label}</p>
          <p className={`text-2xl font-bold ${card.color} mt-2`}>{card.value}</p>
          <p className="text-xs text-gray-500 mt-1">{card.subtext}</p>
        </div>
      ))}
    </div>
  )
}

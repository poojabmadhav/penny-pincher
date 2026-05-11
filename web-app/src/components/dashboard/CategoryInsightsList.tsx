import { useState } from 'react'
import type { CategoryInsight } from '@/lib/analytics'
import type { Transaction } from '@/types'
import { formatCurrency, formatShortDate } from '@/lib/format'

interface CategoryInsightsListProps {
  insights: CategoryInsight[]
  transactions: Transaction[]
}

export default function CategoryInsightsList({
  insights,
  transactions,
}: CategoryInsightsListProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  const getCategoryTransactions = (category: string) => {
    return transactions
      .filter((tx) => tx.original_category === category && tx.amount < 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Category Insights</h2>

      <div className="space-y-3">
        {insights.map((insight) => {
          const categoryTxs = getCategoryTransactions(insight.category)
          const isExpanded = expandedCategory === insight.category

          return (
            <div key={insight.category}>
              <button
                onClick={() =>
                  setExpandedCategory(isExpanded ? null : insight.category)
                }
                className="w-full flex items-center justify-between py-3 px-4 rounded-lg hover:bg-brand-light transition border border-gray-100 text-left"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-light to-brand-light flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-brand-mid">
                      {insight.category.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{insight.category}</p>
                    {insight.insight && (
                      <p className="text-xs text-gray-500">{insight.insight}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <span className="font-bold text-gray-900 whitespace-nowrap">
                    {formatCurrency(insight.total)}
                  </span>
                  <span className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </div>
              </button>

              {/* Inline Expandable Transactions */}
              {isExpanded && categoryTxs.length > 0 && (
                <div className="bg-gray-50 border border-t-0 border-gray-100 rounded-b-lg p-4 space-y-2">
                  {categoryTxs.map((tx, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2 px-2 rounded hover:bg-white transition"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {formatShortDate(tx.date)}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{tx.description}</p>
                      </div>
                      <span className="font-semibold text-gray-900 ml-2 whitespace-nowrap">
                        {formatCurrency(Math.abs(tx.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {isExpanded && categoryTxs.length === 0 && (
                <div className="bg-gray-50 border border-t-0 border-gray-100 rounded-b-lg p-4 text-center text-sm text-gray-500">
                  No transactions in this category
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

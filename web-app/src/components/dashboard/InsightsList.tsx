import { useState } from 'react'
import type { Insight, InsightType, Transaction } from '@/types'
import { formatCurrency, formatShortDate } from '@/lib/format'

const CONFIG: Record<InsightType, { icon: string; bg: string; text: string; border: string }> = {
  recurring:      { icon: '🔁', bg: 'bg-blue-50',   text: 'text-blue-800',   border: 'border-blue-100' },
  category_spike: { icon: '📊', bg: 'bg-amber-50',  text: 'text-amber-800',  border: 'border-amber-100' },
  unusual:        { icon: '⚠️', bg: 'bg-red-50',    text: 'text-red-800',    border: 'border-red-100' },
  amazon:         { icon: '📦', bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-100' },
  info:           { icon: '💡', bg: 'bg-brand-light', text: 'text-brand-dark', border: 'border-brand-light' },
}

interface InsightsListProps {
  insights: Insight[]
  transactions?: Transaction[]
}

function getRelatedTransactions(insight: Insight, transactions: Transaction[]): Transaction[] {
  const spending = transactions.filter((t) => t.amount < 0)

  if (insight.filterMerchant) {
    const key = insight.filterMerchant.toLowerCase()
    // Amazon: broad match
    if (key === 'amazon') {
      return spending.filter((t) => /amazon|amz\b/i.test(t.merchant))
    }
    return spending.filter((t) =>
      t.merchant.toLowerCase().replace(/\s+\d{6,}\s*/g, ' ').replace(/\s+[A-Z]{2,}(\s+[A-Z]{2,})+\s*$/g, '').trim().toLowerCase() === key
    )
  }

  if (insight.filterCategory) {
    return spending.filter(
      (t) => (t.user_category || t.original_category) === insight.filterCategory,
    )
  }

  return []
}

export default function InsightsList({ insights, transactions = [] }: InsightsListProps) {
  const [expanded, setExpanded] = useState<number | null>(null)

  if (insights.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Insights</h2>
        <p className="text-sm text-gray-400">Upload more transactions to see patterns and alerts.</p>
      </div>
    )
  }

  const sorted = [...insights]
    .sort((a, b) => (a.type === 'amazon' ? -1 : b.type === 'amazon' ? 1 : 0))
    .slice(0, 5)

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Insights</h2>

      <div className="space-y-3">
        {sorted.map((insight, index) => {
          const { icon, bg, text, border } = CONFIG[insight.type]
          const related = transactions.length > 0 ? getRelatedTransactions(insight, transactions) : []
          const isClickable = related.length > 0
          const isOpen = expanded === index

          return (
            <div key={index}>
              <button
                onClick={() => isClickable && setExpanded(isOpen ? null : index)}
                className={`w-full flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${bg} ${border} ${
                  isClickable ? 'cursor-pointer hover:brightness-95' : 'cursor-default'
                }`}
              >
                <span className="shrink-0 text-lg leading-none mt-0.5" aria-hidden="true">{icon}</span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${text}`}>{insight.message}</p>
                  {insight.detail && (
                    <p className="text-xs text-gray-500 mt-0.5">{insight.detail}</p>
                  )}
                </div>
                {isClickable && (
                  <svg
                    className={`w-4 h-4 shrink-0 mt-0.5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>

              {/* Expanded transaction list */}
              {isOpen && related.length > 0 && (
                <div className="border border-t-0 border-gray-100 rounded-b-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Merchant</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {related
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((tx, i) => (
                          <tr key={i} className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50">
                            <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{formatShortDate(tx.date)}</td>
                            <td className="px-4 py-2 text-gray-700 truncate max-w-xs">{tx.merchant}</td>
                            <td className="px-4 py-2 text-right font-medium text-gray-900">
                              {formatCurrency(Math.abs(tx.amount))}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

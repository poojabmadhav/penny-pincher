import { useState } from 'react'
import type { AnalysisResult, Trend, Transaction } from '@/types'
import { formatCurrency } from '@/lib/format'
import TransactionDetailModal from './TransactionDetailModal'

interface CategoryBreakdownProps {
  byCategory: AnalysisResult['by_category']
  totalSpent: number
  transactions: Transaction[]
  onCategoryChange?: (transactionIndex: number, newCategory: string) => void
}

const TREND_ICON: Record<Trend, { glyph: string; className: string; label: string }> = {
  up: { glyph: '▲', className: 'text-red-500', label: 'trending up' },
  down: { glyph: '▼', className: 'text-green-500', label: 'trending down' },
  stable: { glyph: '—', className: 'text-gray-400', label: 'stable' },
  insufficient_data: { glyph: '?', className: 'text-gray-300', label: 'not enough data' },
}

const BAR_COLORS = [
  'bg-purple-600',
  'bg-purple-500',
  'bg-purple-400',
  'bg-violet-500',
  'bg-indigo-500',
  'bg-purple-300',
  'bg-violet-400',
  'bg-indigo-400',
]

export default function CategoryBreakdown({
  byCategory,
  totalSpent,
  transactions,
  onCategoryChange,
}: CategoryBreakdownProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const categories = Object.entries(byCategory)
    .sort((a, b) => Math.abs(b[1].total) - Math.abs(a[1].total))
    .slice(0, 8)

  const totalAbsolute = Math.abs(totalSpent)

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Spending by Category</h2>

        {categories.map(([categoryName, categoryData], index) => {
          const percentage =
            totalAbsolute > 0
              ? Math.round((Math.abs(categoryData.total) / totalAbsolute) * 100)
              : 0
          const trend = TREND_ICON[categoryData.trend]

          return (
            <button
              key={categoryName}
              onClick={() => setSelectedCategory(categoryName)}
              className="w-full mb-4 text-left hover:bg-gray-50 p-2 rounded transition"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">{categoryName}</span>
                  <span className={trend.className} aria-label={trend.label} title={trend.label}>
                    {trend.glyph}
                  </span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(categoryData.total, 0)} · {percentage}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className={`${BAR_COLORS[index % BAR_COLORS.length]} h-2.5 rounded-full transition-all`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {categoryData.count} transaction{categoryData.count !== 1 ? 's' : ''} · avg{' '}
                {formatCurrency(categoryData.average_transaction, 0)}
              </p>
            </button>
          )
        })}
      </div>

      {selectedCategory && (
        <TransactionDetailModal
          category={selectedCategory}
          transactions={transactions}
          onClose={() => setSelectedCategory(null)}
          onCategoryChange={onCategoryChange || (() => {})}
        />
      )}
    </>
  )
}

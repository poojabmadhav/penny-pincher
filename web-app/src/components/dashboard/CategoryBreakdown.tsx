import { useState } from 'react'
import type { AnalysisResult, Trend, Transaction } from '@/types'
import { formatCurrency } from '@/lib/format'
import TransactionDetailModal from './TransactionDetailModal'

interface CategoryBreakdownProps {
  byCategory: AnalysisResult['by_category']
  totalSpent: number
  transactions: Transaction[]
  onCategoryChange?: (txKey: string, merchant: string, newCategory: string) => void
}

const TREND_ICON: Record<Trend, { glyph: string; className: string; label: string }> = {
  up:               { glyph: '▲', className: 'text-red-500',   label: 'trending up' },
  down:             { glyph: '▼', className: 'text-green-500', label: 'trending down' },
  stable:           { glyph: '',  className: '',               label: 'stable' },
  insufficient_data:{ glyph: '',  className: '',               label: '' },
}

const BAR_COLORS = [
  'bg-brand-mid',
  'bg-orange-400',
  'bg-amber-400',
  'bg-sky-400',
  'bg-teal-400',
  'bg-brand-light',
  'bg-orange-300',
  'bg-sky-300',
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
                  {trend.glyph && (
                    <span className={trend.className} aria-label={trend.label} title={trend.label}>
                      {trend.glyph}
                    </span>
                  )}
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

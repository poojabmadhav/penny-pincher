import type { AnalysisResult } from '../../types'

interface CategoryBreakdownProps {
  byCategory: AnalysisResult['by_category']
  totalSpent: number
}

export default function CategoryBreakdown({ byCategory, totalSpent }: CategoryBreakdownProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(Math.abs(amount))
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <span className="text-red-500">▲</span>
      case 'down':
        return <span className="text-green-500">▼</span>
      case 'stable':
        return <span className="text-gray-400">—</span>
      default:
        return null
    }
  }

  const barColors = [
    'bg-purple-600',
    'bg-purple-500',
    'bg-purple-400',
    'bg-violet-500',
    'bg-indigo-500',
    'bg-purple-300',
    'bg-violet-400',
    'bg-indigo-400',
  ]

  const categories = Object.entries(byCategory)
    .sort((a, b) => Math.abs(b[1].total) - Math.abs(a[1].total))
    .slice(0, 8)

  const totalAbsolute = Math.abs(totalSpent)

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Spending by Category</h2>

      {categories.map(([categoryName, categoryData], index) => {
        const percentage =
          totalAbsolute > 0
            ? Math.round((Math.abs(categoryData.total) / totalAbsolute) * 100)
            : 0

        return (
          <div key={categoryName} className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">{categoryName}</span>
                {getTrendIcon(categoryData.trend)}
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {formatCurrency(categoryData.total)} · {percentage}%
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div
                className={`${barColors[index % barColors.length]} h-2.5 rounded-full transition-all`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {categoryData.count} transaction{categoryData.count !== 1 ? 's' : ''} · avg{' '}
              {formatCurrency(categoryData.average_transaction)}
            </p>
          </div>
        )
      })}
    </div>
  )
}

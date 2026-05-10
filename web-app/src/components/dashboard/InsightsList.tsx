import type { Insight, InsightType } from '@/types'

const CONFIG: Record<InsightType, { icon: string; bg: string; text: string; border: string }> = {
  recurring:       { icon: '🔁', bg: 'bg-blue-50',   text: 'text-blue-800',   border: 'border-blue-100' },
  category_spike:  { icon: '📊', bg: 'bg-amber-50',  text: 'text-amber-800',  border: 'border-amber-100' },
  unusual:         { icon: '⚠️', bg: 'bg-red-50',    text: 'text-red-800',    border: 'border-red-100' },
  amazon:          { icon: '📦', bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-100' },
  info:            { icon: '💡', bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-100' },
}

interface InsightsListProps {
  insights: Insight[]
}

export default function InsightsList({ insights }: InsightsListProps) {
  if (insights.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Insights</h2>
        <p className="text-sm text-gray-400">Upload more transactions to see patterns and alerts.</p>
      </div>
    )
  }

  // Pin Amazon insight to top
  const sorted = [...insights].sort((a, b) => {
    if (a.type === 'amazon') return -1
    if (b.type === 'amazon') return 1
    return 0
  })

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Insights</h2>

      <div className="space-y-3">
        {sorted.map((insight, index) => {
          const { icon, bg, text, border } = CONFIG[insight.type]
          return (
            <div
              key={index}
              className={`flex items-start gap-3 rounded-lg border p-3 ${bg} ${border}`}
            >
              <span className="shrink-0 text-lg leading-none mt-0.5" aria-hidden="true">{icon}</span>
              <div className="min-w-0">
                <p className={`text-sm font-medium ${text}`}>{insight.message}</p>
                {insight.detail && (
                  <p className="text-xs text-gray-500 mt-0.5">{insight.detail}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

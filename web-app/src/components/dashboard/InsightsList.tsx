interface InsightsListProps {
  insights: string[]
}

export default function InsightsList({ insights }: InsightsListProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Insights</h2>

      <div className="space-y-3">
        {insights.map((insight, index) => (
          <div key={index} className="flex items-start gap-3">
            <span className="text-purple-600 mt-0.5 text-lg shrink-0">💡</span>
            <p className="text-sm text-gray-700">{insight}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

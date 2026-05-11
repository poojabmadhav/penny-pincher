import { useState } from 'react'
import type { AnalysisResult } from '@/types'
import { formatCurrency, formatShortDateWithYear } from '@/lib/format'

interface AnomaliesListProps {
  anomalies: AnalysisResult['anomalies']
}

export default function AnomaliesList({ anomalies }: AnomaliesListProps) {
  const [showAll, setShowAll] = useState(false)
  const displayed = showAll ? anomalies : anomalies.slice(0, 5)

  if (anomalies.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 border-l-4 border-l-green-400">
        <div className="flex items-center gap-3">
          <span className="text-base text-green-500">✓</span>
          <div>
            <p className="text-sm font-medium text-gray-900">No Unusual Transactions</p>
            <p className="text-xs text-gray-500">Your spending patterns look normal</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 border-l-4 border-l-amber-400">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Flagged Transactions</h2>

      <div className="space-y-3">
        {displayed.map((anomaly, index) => (
          <div
            key={`${anomaly.date}-${anomaly.merchant}-${index}`}
            className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg"
          >
            <span className="text-amber-500 mt-0.5 shrink-0" aria-hidden="true">⚠</span>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <p className="font-medium text-sm text-gray-800">{anomaly.merchant}</p>
                <p className="font-bold text-sm text-gray-900 whitespace-nowrap ml-2">
                  {formatCurrency(anomaly.amount)}
                </p>
              </div>
              <p className="text-xs text-gray-500">
                {formatShortDateWithYear(anomaly.date)} · {anomaly.category}
              </p>
              <p className="text-xs text-amber-700 mt-1">{anomaly.reason}</p>
            </div>
          </div>
        ))}
      </div>

      {anomalies.length > 5 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-4 w-full py-2 text-sm font-medium text-brand-mid hover:bg-brand-light rounded-lg transition-colors"
        >
          {showAll ? 'Show Less' : `Show All (${anomalies.length})`}
        </button>
      )}
    </div>
  )
}

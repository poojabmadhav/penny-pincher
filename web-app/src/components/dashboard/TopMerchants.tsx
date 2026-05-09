import type { AnalysisResult } from '@/types'
import { formatCurrency } from '@/lib/format'

interface TopMerchantsProps {
  topMerchants: AnalysisResult['top_merchants']
}

export default function TopMerchants({ topMerchants }: TopMerchantsProps) {
  const displayed = topMerchants.slice(0, 5)

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Merchants</h2>

      <div>
        {displayed.map((merchant, index) => (
          <div
            key={`${merchant.merchant}-${index}`}
            className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0"
          >
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 text-xs flex items-center justify-center font-bold">
                {index + 1}
              </div>
              <div>
                <p className="font-medium text-gray-800 text-sm truncate max-w-[140px]">
                  {merchant.merchant}
                </p>
                <p className="text-xs text-gray-500">
                  {merchant.count} transaction{merchant.count !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <span className="font-bold text-gray-900 whitespace-nowrap">
              {formatCurrency(merchant.total)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

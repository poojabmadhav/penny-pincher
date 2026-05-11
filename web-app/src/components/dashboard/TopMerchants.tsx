import { useState } from 'react'
import type { AnalysisResult, Transaction } from '@/types'
import { formatCurrency, formatShortDate } from '@/lib/format'

interface TopMerchantsProps {
  topMerchants: AnalysisResult['top_merchants']
  transactions: Transaction[]
}

export default function TopMerchants({ topMerchants, transactions }: TopMerchantsProps) {
  const displayed = topMerchants.slice(0, 5)
  const [selectedMerchant, setSelectedMerchant] = useState<string | null>(null)
  const selectedTxs = selectedMerchant
    ? transactions.filter((tx) => tx.merchant === selectedMerchant)
    : []

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Merchants</h2>

        <div>
          {displayed.map((merchant, index) => (
            <button
              key={`${merchant.merchant}-${index}`}
              onClick={() => setSelectedMerchant(merchant.merchant)}
              className="w-full flex items-center justify-between py-3 px-2 rounded hover:bg-brand-light transition border-b border-gray-50 last:border-0 text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-6 h-6 rounded-full bg-brand-light text-brand-mid text-xs flex items-center justify-center font-bold shrink-0">
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">
                    {merchant.merchant}
                  </p>
                  <p className="text-xs text-gray-500">
                    {merchant.count} transaction{merchant.count !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <span className="font-bold text-gray-900 whitespace-nowrap ml-2">
                {formatCurrency(merchant.total)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {selectedMerchant && selectedTxs.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{selectedMerchant}</h3>
              <button
                onClick={() => setSelectedMerchant(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-3">
                {selectedTxs.map((tx, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">{formatShortDate(tx.date)}</p>
                      <p className="text-xs text-gray-500 truncate">{tx.description}</p>
                    </div>
                    <span className="font-semibold text-gray-900 ml-2 whitespace-nowrap">
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

import { useState, useMemo } from 'react'
import type { Transaction } from '@/types'

const CATEGORIES = [
  'Travel',
  'Healthcare',
  'Shopping',
  'Other',
  'Food & Dining',
  'Subscriptions',
  'Entertainment',
  'Education',
  'Income',
]

interface TransactionDetailModalProps {
  category: string
  transactions: Transaction[]
  onClose: () => void
  onCategoryChange: (transactionIndex: number, newCategory: string) => void
}

export default function TransactionDetailModal({
  category,
  transactions,
  onClose,
  onCategoryChange,
}: TransactionDetailModalProps) {
  const [localChanges, setLocalChanges] = useState<Record<number, string>>({})

  const categoryTransactions = useMemo(
    () =>
      transactions
        .map((t, idx) => ({ ...t, index: idx }))
        .filter((t) => (localChanges[t.index] || t.original_category) === category),
    [transactions, category, localChanges],
  )

  const totalAmount = categoryTransactions.reduce((sum, t) => sum + t.amount, 0)

  const handleCategoryChange = (transactionIndex: number, newCategory: string) => {
    setLocalChanges({ ...localChanges, [transactionIndex]: newCategory })
    onCategoryChange(transactionIndex, newCategory)
  }

  const handleClose = () => {
    setLocalChanges({})
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{category}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {categoryTransactions.length} transactions • Total: $
              {Math.abs(totalAmount).toFixed(2)}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Transactions List */}
        <div className="overflow-y-auto flex-grow">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr className="border-b border-gray-200">
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Date</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Merchant</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-700">Amount</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Category</th>
              </tr>
            </thead>
            <tbody>
              {categoryTransactions.map((transaction, idx) => (
                <tr
                  key={idx}
                  className="border-b border-gray-100 hover:bg-gray-50 transition"
                >
                  <td className="px-6 py-4 text-gray-900">{transaction.date}</td>
                  <td className="px-6 py-4 text-gray-700">
                    <div className="font-medium">{transaction.merchant}</div>
                    <div className="text-xs text-gray-500">{transaction.description}</div>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900">
                    ${Math.abs(transaction.amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={localChanges[transaction.index] || transaction.original_category || ''}
                      onChange={(e) => handleCategoryChange(transaction.index, e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                    >
                      <option value="">Select...</option>
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50 flex-shrink-0">
          <button
            onClick={handleClose}
            className="w-full bg-purple-600 text-white font-semibold py-2 rounded-lg hover:bg-purple-700 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

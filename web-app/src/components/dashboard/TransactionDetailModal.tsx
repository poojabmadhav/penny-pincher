import { useState, useMemo } from 'react'
import type { Transaction } from '@/types'

const CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Travel',
  'Shopping',
  'Subscriptions',
  'Entertainment',
  'Healthcare',
  'Utilities',
  'Personal Care',
  'Education',
  'Home & Garden',
  'Gifts & Donations',
  'Insurance',
  'Business Meals',
  'Cloud Services',
  'Software Expenses',
  'Office Supplies',
  'Marketing & Advertising',
  'Legal & Compliance',
  'Other',
  'Income',
  'Transfer',
]

interface TransactionDetailModalProps {
  category: string
  transactions: Transaction[]
  onClose: () => void
  onCategoryChange: (txKey: string, merchant: string, newCategory: string) => void
}

function txKey(tx: Transaction): string {
  return `${tx.date}|${tx.merchant}|${tx.amount}`
}

export default function TransactionDetailModal({
  category,
  transactions,
  onClose,
  onCategoryChange,
}: TransactionDetailModalProps) {
  const [localChanges, setLocalChanges] = useState<Record<string, string>>({})

  const categoryTransactions = useMemo(
    () =>
      transactions.filter(
        (tx) => (localChanges[txKey(tx)] || tx.user_category || tx.original_category) === category,
      ),
    [transactions, category, localChanges],
  )

  const totalAmount = categoryTransactions.reduce((sum, t) => sum + t.amount, 0)

  const handleCategoryChange = (tx: Transaction, newCategory: string) => {
    const key = txKey(tx)
    setLocalChanges((prev) => ({ ...prev, [key]: newCategory }))
    onCategoryChange(key, tx.merchant, newCategory)
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
              {categoryTransactions.length} transactions · Total: $
              {Math.abs(totalAmount).toFixed(2)}
            </p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
              {categoryTransactions.map((tx, idx) => (
                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-gray-900">{tx.date}</td>
                  <td className="px-6 py-4 text-gray-700">
                    <div className="font-medium">{tx.merchant}</div>
                    <div className="text-xs text-gray-500">{tx.description}</div>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900">
                    ${Math.abs(tx.amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={localChanges[txKey(tx)] || tx.user_category || tx.original_category || ''}
                      onChange={(e) => handleCategoryChange(tx, e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-mid cursor-pointer"
                    >
                      <option value="">Select...</option>
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
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
          <p className="text-xs text-gray-400 mb-3 text-center">
            Category changes are saved automatically and remembered for future uploads.
          </p>
          <button
            onClick={handleClose}
            className="w-full bg-brand-accent text-brand-dark font-semibold py-2 rounded-lg hover:bg-brand-dark transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

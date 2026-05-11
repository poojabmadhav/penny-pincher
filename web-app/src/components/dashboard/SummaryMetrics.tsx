import type { CashFlowSummary } from '@/lib/analytics'
import { formatCurrency } from '@/lib/format'

interface SummaryMetricsProps {
  cashFlow: CashFlowSummary
  transactionCount: number
}

export default function SummaryMetrics({ cashFlow, transactionCount }: SummaryMetricsProps) {
  const cards = [
    {
      label: 'TOTAL INCOME',
      value: formatCurrency(cashFlow.income),
      color: 'text-emerald-600',
    },
    {
      label: 'TOTAL EXPENSES',
      value: formatCurrency(cashFlow.expenses),
      color: 'text-red-500',
    },
    {
      label: 'NET INCOME',
      value: formatCurrency(Math.abs(cashFlow.net)),
      color: cashFlow.net >= 0 ? 'text-emerald-600' : 'text-red-500',
      prefix: cashFlow.net < 0 ? '-' : '',
    },
    {
      label: 'SAVINGS RATE',
      value:
        cashFlow.income > 0
          ? `${cashFlow.savingsRate.toFixed(1)}%`
          : `${transactionCount} txns`,
      color: cashFlow.income > 0 && cashFlow.savingsRate > 0 ? 'text-blue-600' : 'text-gray-500',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase">
            {card.label}
          </p>
          <p className={`text-2xl font-bold mt-2 ${card.color}`}>
            {card.prefix}{card.value}
          </p>
        </div>
      ))}
    </div>
  )
}

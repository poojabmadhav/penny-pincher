import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { AnalysisResult, Transaction } from '@/types'
import { formatCurrency } from '@/lib/format'

const COLORS = [
  '#2563eb',
  '#16a34a',
  '#f97316',
  '#9333ea',
  '#06b6d4',
  '#dc2626',
  '#ca8a04',
  '#0891b2',
  '#7c3aed',
  '#059669',
  '#d97706',
  '#db2777',
  '#65a30d',
  '#0284c7',
  '#be185d',
]

interface MonthlyChartsProps {
  byCategory: AnalysisResult['by_category']
  totalSpent: number
  dateRange: string
  transactions: Transaction[]
  monthLabel: string
}

interface TooltipData {
  name: string
  value: number
  percent: number
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: TooltipData }> }) {
  if (active && payload && payload.length) {
    const d = payload[0].payload
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg text-sm">
        <p className="font-semibold text-gray-900">{d.name}</p>
        <p className="text-gray-700">{formatCurrency(d.value)}</p>
        <p className="text-gray-400">{d.percent.toFixed(1)}%</p>
      </div>
    )
  }
  return null
}

export default function MonthlyCharts({
  byCategory,
  totalSpent,
  dateRange,
  transactions,
  monthLabel,
}: MonthlyChartsProps) {
  // Build donut data from by_category
  const donutData = useMemo(() => {
    return Object.entries(byCategory)
      .sort((a, b) => Math.abs(b[1].total) - Math.abs(a[1].total))
      .map(([name, data]) => ({
        name,
        value: Math.abs(data.total),
        percent: totalSpent > 0 ? (Math.abs(data.total) / totalSpent) * 100 : 0,
      }))
  }, [byCategory, totalSpent])

  // Compute income vs expenses from transactions
  const { income, expenses, net } = useMemo(() => {
    let inc = 0
    let exp = 0
    transactions.forEach((tx) => {
      if (tx.amount > 0) inc += tx.amount
      else exp += Math.abs(tx.amount)
    })
    return { income: inc, expenses: exp, net: inc - exp }
  }, [transactions])

  const maxBar = Math.max(income, expenses)
  const incomeBarPct = maxBar > 0 ? (income / maxBar) * 100 : 0
  const expenseBarPct = maxBar > 0 ? (expenses / maxBar) * 100 : 0

  // Parse end date for "as of" label
  const asOfDate = (() => {
    const parts = dateRange.split(' to ')
    const raw = parts[parts.length - 1]?.trim()
    if (!raw) return ''
    const d = new Date(raw)
    return isNaN(d.getTime())
      ? raw
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  })()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      {/* Spending Donut */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex flex-col items-center">
        <h2 className="text-base font-semibold text-gray-700 mb-1 self-start">
          Total {monthLabel} Spending
        </h2>

        <div className="relative" style={{ width: 280, height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={donutData}
                cx="50%"
                cy="50%"
                innerRadius={85}
                outerRadius={128}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                stroke="#fff"
                strokeWidth={2}
              >
                {donutData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-gray-900 leading-tight">
              {formatCurrency(totalSpent)}
            </span>
            {asOfDate && (
              <span className="text-xs text-gray-400 mt-1">as of {asOfDate}</span>
            )}
          </div>
        </div>

        {/* Compact legend below the donut */}
        <div className="w-full mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
          {donutData.map((d, i) => (
            <div key={d.name} className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="text-xs text-gray-600 truncate">{d.name}</span>
              <span className="text-xs text-gray-400 ml-auto flex-shrink-0">
                {d.percent.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Income vs Expenses */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex flex-col justify-center gap-6">
        <h2 className="text-base font-semibold text-gray-700">Cash Flow</h2>

        <div className="space-y-5">
          {/* Income */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-gray-700">Income</span>
              <span className="text-sm font-bold text-emerald-600">{formatCurrency(income)}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className="bg-emerald-500 h-3 rounded-full transition-all"
                style={{ width: `${incomeBarPct}%` }}
              />
            </div>
          </div>

          {/* Expenses */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-gray-700">Expenses</span>
              <span className="text-sm font-bold text-brand-mid">{formatCurrency(expenses)}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className="bg-brand-mid h-3 rounded-full transition-all"
                style={{ width: `${expenseBarPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Net result */}
        <div className="border-t border-gray-100 pt-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Net</span>
            <span className={`text-xl font-bold ${net >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {net >= 0 ? '+' : ''}{formatCurrency(net)}
            </span>
          </div>
          {income > 0 && (
            <p className="text-xs text-gray-400 mt-1 text-right">
              {net >= 0
                ? `Saved ${((net / income) * 100).toFixed(1)}% of income`
                : `Overspent by ${formatCurrency(Math.abs(net))}`}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

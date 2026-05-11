import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { CategoryMetrics } from '@/lib/analytics'
import { formatCurrency } from '@/lib/format'

interface CategoryChartProps {
  metrics: CategoryMetrics[]
}

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

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ payload: { name: string; value: number; percent: number } }>
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
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

export default function CategoryChart({ metrics }: CategoryChartProps) {
  const total = metrics.reduce((sum, m) => sum + m.total, 0)

  const data = metrics.map((m) => ({
    name: m.category,
    value: m.total,
    percent: m.percentOfTotal,
  }))

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Spending by Category</h2>
      {/* Mobile: stacked. Desktop: side by side */}
      <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6">
        {/* Donut — smaller on mobile */}
        <div className="flex-shrink-0 relative mx-auto md:mx-0"
          style={{ width: 200, height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={56}
                outerRadius={90}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                stroke="#fff"
                strokeWidth={2}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="text-sm font-bold text-gray-900 leading-tight">
                {formatCurrency(total)}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">Total</div>
            </div>
          </div>
        </div>

        {/* Legend — 1 col on mobile, 2 col on desktop */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 content-start">
          {metrics.map((m, index) => (
            <div key={m.category} className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-gray-700 truncate text-sm">{m.category}</span>
              </div>
              <div className="whitespace-nowrap ml-1 text-right flex-shrink-0">
                <span className="font-semibold text-gray-900 text-sm">{formatCurrency(m.total)}</span>
                <span className="text-gray-400 text-xs ml-1">({m.percentOfTotal.toFixed(0)}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

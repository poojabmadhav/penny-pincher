import { useState, useMemo, useRef, useEffect } from 'react'
import type { Transaction } from '@/types'
import {
  filterTransactionsByDateRange,
  calculateCategoryMetrics,
  getMonthlyIncomeAndSpending,
  generateCategoryInsights,
  getDateRangeForSelection,
  calculateCashFlowSummary,
} from '@/lib/analytics'
import { exportAllCsv } from '@/lib/export'
import DateRangeSelector from './DateRangeSelector'
import SummaryMetrics from './SummaryMetrics'
import CategoryChart from './CategoryChart'
import TrendChart from './TrendChart'
import CategoryInsightsList from './CategoryInsightsList'

interface DashboardViewProps {
  allTransactions: Transaction[]
  onUploadAnother: () => void
}

type DateSelection = 'this-month' | 'year-to-date' | 'all-data' | 'custom'

function printDashboard() {
  document.body.classList.add('pdf-print')
  window.addEventListener(
    'afterprint',
    () => document.body.classList.remove('pdf-print'),
    { once: true },
  )
  window.print()
}

export default function DashboardView({ allTransactions, onUploadAnother }: DashboardViewProps) {
  const [dateSelection, setDateSelection] = useState<DateSelection>('all-data')
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Years that actually exist in the uploaded data — drives the year chips
  const availableYears = useMemo(() => {
    const yearSet = new Set(allTransactions.map((tx) => new Date(tx.date).getFullYear()))
    return Array.from(yearSet).sort((a, b) => b - a)
  }, [allTransactions])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredTransactions = useMemo(() => {
    // Date range filter (year handled separately so multi-select works)
    const { start, end } = getDateRangeForSelection(dateSelection, customStart, customEnd, 0)
    let txs = filterTransactionsByDateRange(allTransactions, start, end)
    // Multi-year filter applied on top
    if (selectedYears.length > 0) {
      const yearSet = new Set(selectedYears)
      txs = txs.filter((tx) => yearSet.has(new Date(tx.date).getFullYear()))
    }
    return txs
  }, [dateSelection, customStart, customEnd, selectedYears, allTransactions])

  const categoryMetrics = useMemo(
    () => calculateCategoryMetrics(filteredTransactions),
    [filteredTransactions],
  )

  const monthlyTrend = useMemo(
    () => getMonthlyIncomeAndSpending(filteredTransactions),
    [filteredTransactions],
  )

  const cashFlow = useMemo(
    () => calculateCashFlowSummary(filteredTransactions),
    [filteredTransactions],
  )

  const insights = useMemo(
    () => generateCategoryInsights(categoryMetrics, filteredTransactions).slice(0, 5),
    [categoryMetrics, filteredTransactions],
  )

  const spendingCount = filteredTransactions.filter((t) => t.amount < 0).length

  return (
    <div className="space-y-6">

      {/* ── Date range + actions dropdown ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start gap-3">
        <div className="flex-1">
          <DateRangeSelector
            dateSelection={dateSelection}
            setDateSelection={setDateSelection}
            selectedYears={selectedYears}
            setSelectedYears={setSelectedYears}
            availableYears={availableYears}
            customStart={customStart}
            setCustomStart={setCustomStart}
            customEnd={customEnd}
            setCustomEnd={setCustomEnd}
          />
        </div>

        {/* Dropdown trigger */}
        <div ref={menuRef} className="relative sm:pt-[18px]">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm whitespace-nowrap"
          >
            Save file / Upload more
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform duration-150 ${menuOpen ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
              <button
                onClick={() => { onUploadAnother(); setMenuOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-brand-light hover:text-brand-dark transition-colors text-left"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload Another File
              </button>
              <button
                onClick={() => { exportAllCsv(filteredTransactions); setMenuOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-brand-light hover:text-brand-dark transition-colors text-left border-t border-gray-100"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Save for Re-use
              </button>
              <button
                onClick={() => { printDashboard(); setMenuOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-brand-light hover:text-brand-dark transition-colors text-left border-t border-gray-100"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Dashboard
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Charts + insights (all included in PDF) ──────────────────────── */}
      <div id="dashboard-charts" className="space-y-6">
        <SummaryMetrics cashFlow={cashFlow} transactionCount={spendingCount} />

        <div className="space-y-6">
          {categoryMetrics.length > 0 && <CategoryChart metrics={categoryMetrics} />}
          {monthlyTrend.length > 0 && <TrendChart data={monthlyTrend} />}
        </div>

        {insights.length > 0 && (
          <CategoryInsightsList insights={insights} transactions={filteredTransactions} />
        )}
      </div>

      {filteredTransactions.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-12 border border-gray-100 text-center">
          <p className="text-gray-500 text-lg">No transactions in this date range.</p>
          <p className="text-gray-400 text-sm mt-1">
            Try selecting "All Data" to see all uploaded transactions.
          </p>
        </div>
      )}
    </div>
  )
}

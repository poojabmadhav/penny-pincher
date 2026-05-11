import { useState, useMemo } from 'react'
import type { FileRecord, Transaction } from '@/types'
import type { MonthlyConsolidation } from '@/lib/consolidation'
import { recomputeResult } from '@/lib/consolidation'
import { loadCategoryOverrides, saveCategoryOverride, saveMerchantRule } from '@/lib/storage'
import FileHistoryPanel from './FileHistoryPanel'
import MonthlyCharts from './MonthlyCharts'
import CategoryBreakdown from './CategoryBreakdown'
import TopMerchants from './TopMerchants'
import InsightsList from './InsightsList'
import AnomaliesList from './AnomaliesList'
import DashboardView from './DashboardView'

interface DashboardShellProps {
  consolidation: MonthlyConsolidation
  consolidations: MonthlyConsolidation[]
  fileHistory: FileRecord[]
  onUploadAnother: () => void
  onSelectMonth: (month: string) => void
  onDeleteFile: (fileId: string) => void
}

function applyOverridesToTransactions(
  transactions: Transaction[],
  overrides: Record<string, string>,
): Transaction[] {
  return transactions.map((tx) => {
    const key = `${tx.date}|${tx.merchant}|${tx.amount}`
    const override = overrides[key]
    if (!override) return tx
    return { ...tx, user_category: override, original_category: override }
  })
}

export default function DashboardShell({
  consolidation,
  consolidations,
  fileHistory,
  onUploadAnother,
  onSelectMonth,
  onDeleteFile,
}: DashboardShellProps) {
  const [activeView, setActiveView] = useState<'dashboard' | 'month'>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, string>>(
    () => loadCategoryOverrides(),
  )

  const effectiveResult = useMemo(() => {
    const overridden = applyOverridesToTransactions(
      consolidation.analysisResult.transactions ?? [],
      categoryOverrides,
    )
    return recomputeResult(
      overridden,
      consolidation.analysisResult.account_type,
      consolidation.analysisResult.summary.date_range,
    )
  }, [consolidation, categoryOverrides])

  const allTransactions = useMemo<Transaction[]>(() => {
    const seen = new Set<string>()
    const raw = consolidations.flatMap((c) =>
      (c.analysisResult.transactions ?? []).filter((tx) => {
        const key = `${tx.date}|${tx.merchant}|${tx.amount}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      }),
    )
    return applyOverridesToTransactions(raw, categoryOverrides)
  }, [consolidations, categoryOverrides])

  const handleCategoryChange = (txKey: string, merchant: string, newCategory: string) => {
    saveCategoryOverride(txKey, newCategory)
    saveMerchantRule(merchant, newCategory)
    setCategoryOverrides((prev) => ({ ...prev, [txKey]: newCategory }))
  }

  const handleSelectMonth = (month: string) => {
    setActiveView('month')
    setSidebarOpen(false)
    onSelectMonth(month)
  }

  const handleSelectDashboard = () => {
    setActiveView('dashboard')
    setSidebarOpen(false)
  }

  return (
    <div className="flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — drawer on mobile, static on desktop */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transition-transform duration-300 md:static md:translate-x-0 md:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <FileHistoryPanel
          consolidations={consolidations}
          activeMonth={consolidation.month}
          isDashboardActive={activeView === 'dashboard'}
          fileHistory={fileHistory}
          onSelectDashboard={handleSelectDashboard}
          onSelectMonth={handleSelectMonth}
          onDeleteFile={onDeleteFile}
        />
      </div>

      <div className="flex-1 min-w-0">
        {/* Header */}
        <header className="bg-brand-dark text-white px-4 md:px-6 py-3 md:py-4 sticky top-0 z-10 shadow-md">
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold text-white shrink-0">PennyPincher</h1>
            <div className="border-l border-brand-mid pl-3 min-w-0 hidden sm:block">
              <p className="text-xs md:text-sm text-brand-light flex items-center gap-1.5 truncate">
                <span>🔒</span>
                Track where your pennies roll while your data stays on your device
              </p>
            </div>
          </div>
        </header>

        {/* Main Content — extra bottom padding on mobile for tab bar */}
        <main className="p-3 md:p-6 pb-20 md:pb-6">
          {activeView === 'dashboard' ? (
            <DashboardView allTransactions={allTransactions} onUploadAnother={onUploadAnother} />
          ) : (
            <>
              <MonthlyCharts
                byCategory={effectiveResult.by_category}
                totalSpent={effectiveResult.summary.total_spent}
                dateRange={effectiveResult.summary.date_range}
                transactions={effectiveResult.transactions}
                monthLabel={consolidation.monthLabel}
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <CategoryBreakdown
                  byCategory={effectiveResult.by_category}
                  totalSpent={effectiveResult.summary.total_spent}
                  transactions={effectiveResult.transactions}
                  onCategoryChange={handleCategoryChange}
                />
                <TopMerchants
                  topMerchants={effectiveResult.top_merchants}
                  transactions={effectiveResult.transactions}
                />
              </div>

              <InsightsList insights={effectiveResult.insights} transactions={effectiveResult.transactions} />
              <AnomaliesList anomalies={effectiveResult.anomalies} />
            </>
          )}
        </main>

        {/* ── Mobile bottom tab bar ── */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-30 flex">
          <button
            onClick={handleSelectDashboard}
            className={`flex-1 py-3 flex flex-col items-center gap-0.5 transition-colors ${
              activeView === 'dashboard' ? 'text-brand-dark' : 'text-gray-400'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs font-medium">Dashboard</span>
          </button>
          <button
            onClick={() => setSidebarOpen(true)}
            className={`flex-1 py-3 flex flex-col items-center gap-0.5 transition-colors ${
              activeView === 'month' ? 'text-brand-dark' : 'text-gray-400'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs font-medium">
              Months
              {consolidations.length > 0 && (
                <span className="ml-1 text-xs text-brand-mid">({consolidations.length})</span>
              )}
            </span>
          </button>
        </nav>
      </div>
    </div>
  )
}

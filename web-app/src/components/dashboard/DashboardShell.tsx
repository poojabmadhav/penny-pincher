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
  // Load persisted overrides on mount; updated as user recategorises
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, string>>(
    () => loadCategoryOverrides(),
  )

  // Month view: apply overrides then recompute all aggregates
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

  // Dashboard view: aggregate all months with overrides applied
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
    onSelectMonth(month)
  }

  const handleSelectDashboard = () => setActiveView('dashboard')


  return (
    <div className="flex">
      <FileHistoryPanel
        consolidations={consolidations}
        activeMonth={consolidation.month}
        isDashboardActive={activeView === 'dashboard'}
        fileHistory={fileHistory}
        onSelectDashboard={handleSelectDashboard}
        onSelectMonth={handleSelectMonth}
        onDeleteFile={onDeleteFile}
      />

      <div className="flex-1 min-w-0">
        {/* Header */}
        <header className="bg-brand-dark text-white px-6 py-4 sticky top-0 z-10 shadow-md">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white shrink-0">PennyPincher</h1>
            <div className="border-l border-brand-mid pl-3 min-w-0">
              <p className="text-sm text-brand-light flex items-center gap-1.5">
                <span>🔒</span>
                Track where your pennies roll while your data stays on your device
              </p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6">
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
      </div>
    </div>
  )
}

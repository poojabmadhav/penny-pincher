import { useState } from 'react'
import type { FileRecord } from '@/types'
import type { MonthlyConsolidation } from '@/lib/consolidation'
import FileHistoryPanel from './FileHistoryPanel'
import SummaryCards from './SummaryCards'
import CategoryBreakdown from './CategoryBreakdown'
import TopMerchants from './TopMerchants'
import InsightsList from './InsightsList'
import AnomaliesList from './AnomaliesList'

interface DashboardShellProps {
  consolidation: MonthlyConsolidation
  consolidations: MonthlyConsolidation[]
  fileHistory: FileRecord[]
  onUploadAnother: () => void
  onSelectMonth: (month: string) => void
  onDeleteFile: (fileId: string) => void
}

export default function DashboardShell({
  consolidation,
  consolidations,
  fileHistory,
  onUploadAnother,
  onSelectMonth,
  onDeleteFile,
}: DashboardShellProps) {
  const [categoryOverrides, setCategoryOverrides] = useState<Record<number, string>>({})

  const result = consolidation.analysisResult
  const showSidebar = consolidations.length >= 2

  const handleCategoryChange = (transactionIndex: number, newCategory: string) => {
    setCategoryOverrides({ ...categoryOverrides, [transactionIndex]: newCategory })
    // TODO: Persist to localStorage
  }

  return (
    <div className="flex">
      {showSidebar && (
        <FileHistoryPanel
          consolidations={consolidations}
          activeMonth={consolidation.month}
          fileHistory={fileHistory}
          onSelectMonth={onSelectMonth}
          onDeleteFile={onDeleteFile}
        />
      )}

      <div className="flex-1 min-w-0">
        {/* Header */}
        <header className="bg-purple-700 text-white px-6 py-4 sticky top-0 z-10 shadow-md">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <h1 className="text-2xl font-bold shrink-0">PennyPincher</h1>
              <div className="border-l border-purple-600 pl-4 min-w-0">
                <p className="text-sm text-purple-100 truncate">{consolidation.monthLabel}</p>
                <p className="text-xs text-purple-200">{consolidation.fileCount} file(s)</p>
              </div>
            </div>
            <button
              onClick={onUploadAnother}
              className="px-4 py-2 bg-white text-purple-700 rounded-lg font-medium hover:bg-purple-50 transition-colors shrink-0"
            >
              Upload Another File
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6">
          <SummaryCards
            summary={result.summary}
            byCategory={result.by_category}
            accountType={result.account_type}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <CategoryBreakdown
              byCategory={result.by_category}
              totalSpent={result.summary.total_spent}
              transactions={result.transactions}
              onCategoryChange={handleCategoryChange}
            />
            <TopMerchants topMerchants={result.top_merchants} />
          </div>

          <InsightsList insights={result.insights} />
          <AnomaliesList anomalies={result.anomalies} />
        </main>
      </div>
    </div>
  )
}

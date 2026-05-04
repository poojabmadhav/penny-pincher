import type { FileRecord } from '../../types'
import FileHistoryPanel from './FileHistoryPanel'
import SummaryCards from './SummaryCards'
import CategoryBreakdown from './CategoryBreakdown'
import TopMerchants from './TopMerchants'
import InsightsList from './InsightsList'
import AnomaliesList from './AnomaliesList'

interface DashboardShellProps {
  record: FileRecord
  fileHistory: FileRecord[]
  onUploadAnother: () => void
  onSelectRecord: (id: string) => void
}

export default function DashboardShell({
  record,
  fileHistory,
  onUploadAnother,
  onSelectRecord,
}: DashboardShellProps) {
  if (!record.analysisResult) return null

  const result = record.analysisResult
  const showSidebar = fileHistory.length >= 2

  return (
    <div className="min-h-screen flex">
      {showSidebar && (
        <FileHistoryPanel
          history={fileHistory}
          activeId={record.id}
          onSelect={onSelectRecord}
        />
      )}

      <div className="flex-1">
        {/* Header */}
        <header className="bg-purple-700 text-white px-6 py-4 sticky top-0 z-10 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">PennyPincher</h1>
              <div className="border-l border-purple-600 pl-4">
                <p className="text-sm text-purple-100">{record.fileName}</p>
                <p className="text-xs text-purple-200 capitalize">{record.accountType} Account</p>
              </div>
            </div>
            <button
              onClick={onUploadAnother}
              className="px-4 py-2 bg-white text-purple-700 rounded-lg font-medium hover:bg-purple-50 transition-colors"
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

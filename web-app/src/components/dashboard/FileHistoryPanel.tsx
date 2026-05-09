import { useState } from 'react'
import type { FileRecord } from '@/types'
import type { MonthlyConsolidation } from '@/lib/consolidation'
import { formatShortDate } from '@/lib/format'

interface FileHistoryPanelProps {
  consolidations: MonthlyConsolidation[]
  activeMonth: string
  fileHistory: FileRecord[]
  onSelectMonth: (month: string) => void
  onDeleteFile: (fileId: string) => void
}

export default function FileHistoryPanel({
  consolidations,
  activeMonth,
  fileHistory,
  onSelectMonth,
  onDeleteFile,
}: FileHistoryPanelProps) {
  const [expandedMonth, setExpandedMonth] = useState<string | null>(activeMonth)

  return (
    <aside className="hidden md:block w-64 shrink-0 bg-white border-r border-gray-200 min-h-screen sticky top-0 overflow-y-auto">
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Monthly Budgets</h3>
      </div>

      <nav className="flex flex-col">
        {consolidations.map((consolidation) => {
          const isActive = consolidation.month === activeMonth
          const isExpanded = consolidation.month === expandedMonth
          const filesInMonth = fileHistory.filter((f) => consolidation.sourceFiles.includes(f.fileName))

          return (
            <div key={consolidation.month} className={`border-b border-gray-50 ${isActive ? 'bg-purple-50' : ''}`}>
              {/* Month header */}
              <button
                onClick={() => {
                  onSelectMonth(consolidation.month)
                  setExpandedMonth(consolidation.month)
                }}
                className="w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors flex items-start justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800">{consolidation.monthLabel}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{consolidation.fileCount} file(s)</p>
                </div>
                <span className={`shrink-0 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                  ▶
                </span>
              </button>

              {/* Expanded files list */}
              {isExpanded && filesInMonth.length > 0 && (
                <div className="bg-gray-50 border-t border-gray-100">
                  {filesInMonth.map((file) => (
                    <div key={file.id} className="group relative px-4 py-2 hover:bg-gray-100 transition-colors flex items-start justify-between gap-2 border-b border-gray-100 last:border-b-0">
                      <div className="min-w-0 flex-1 text-xs">
                        <p className="text-gray-600 truncate">{file.fileName}</p>
                        <p className="text-gray-400 mt-0.5">{formatShortDate(file.uploadedAt)}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm(`Remove "${file.fileName}" from this budget?`)) {
                            onDeleteFile(file.id)
                          }
                        }}
                        aria-label={`Delete ${file.fileName}`}
                        className="shrink-0 w-5 h-5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex items-center justify-center text-sm"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}

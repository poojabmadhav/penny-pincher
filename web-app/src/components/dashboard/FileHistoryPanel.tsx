import { useState } from 'react'
import type { FileRecord } from '@/types'
import type { MonthlyConsolidation } from '@/lib/consolidation'
import { formatShortDate } from '@/lib/format'

interface FileHistoryPanelProps {
  consolidations: MonthlyConsolidation[]
  activeMonth: string
  isDashboardActive: boolean
  fileHistory: FileRecord[]
  onSelectDashboard: () => void
  onSelectMonth: (month: string) => void
  onDeleteFile: (fileId: string) => void
}

export default function FileHistoryPanel({
  consolidations,
  activeMonth,
  isDashboardActive,
  fileHistory,
  onSelectDashboard,
  onSelectMonth,
  onDeleteFile,
}: FileHistoryPanelProps) {
  const [expandedMonth, setExpandedMonth] = useState<string | null>(activeMonth)

  return (
    <aside className="w-44 shrink-0 bg-white border-r border-gray-200 h-full md:min-h-screen sticky top-0 overflow-y-auto">

      {/* Dashboard nav item */}
      <button
        onClick={onSelectDashboard}
        className="w-full text-left px-3 py-2.5 flex items-center gap-2 border-b border-gray-100 transition-colors bg-brand-accent text-brand-dark hover:brightness-95"
      >
        <span className="text-sm">📊</span>
        <span className="text-xs font-semibold text-brand-dark">
          Dashboard
        </span>
      </button>

      {/* Monthly breakdown section */}
      <div className="px-3 py-2 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Months</h3>
      </div>

      <nav className="flex flex-col">
        {consolidations.map((consolidation) => {
          const isActive = !isDashboardActive && consolidation.month === activeMonth
          const isExpanded = consolidation.month === expandedMonth
          const filesInMonth = fileHistory.filter((f) => consolidation.sourceFiles.includes(f.fileName))

          return (
            <div key={consolidation.month} className={`border-b border-gray-50 ${isActive ? 'bg-brand-light' : ''}`}>
              {/* Month header */}
              <button
                onClick={() => {
                  onSelectMonth(consolidation.month)
                  setExpandedMonth(consolidation.month)
                }}
                className="w-full text-left px-3 py-2 hover:bg-brand-light transition-colors flex items-center justify-between gap-1"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-800 truncate">{consolidation.monthLabel}</p>
                  <p className="text-xs text-gray-400">{consolidation.fileCount} file(s)</p>
                </div>
                <span className={`shrink-0 text-gray-400 text-xs transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                  ▶
                </span>
              </button>

              {/* Expanded files list */}
              {isExpanded && filesInMonth.length > 0 && (
                <div className="bg-gray-50 border-t border-gray-100">
                  {Array.from(
                    filesInMonth.reduce(
                      (map, file) => {
                        if (!map.has(file.fileName)) map.set(file.fileName, [])
                        map.get(file.fileName)!.push(file)
                        return map
                      },
                      new Map<string, typeof filesInMonth>(),
                    ).entries(),
                  ).map(([fileName, filesWithName]) => {
                    const latestFile = filesWithName.sort(
                      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
                    )[0]
                    const isDuplicate = filesWithName.length > 1

                    return (
                      <div
                        key={latestFile.id}
                        className="group relative px-3 py-1.5 hover:bg-gray-100 transition-colors flex items-center justify-between gap-1 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="min-w-0 flex-1 text-xs">
                          <p className="text-gray-500 truncate">
                            {fileName}
                            {isDuplicate && <span className="text-gray-400 ml-1">×{filesWithName.length}</span>}
                          </p>
                          <p className="text-gray-400 mt-0.5">{formatShortDate(latestFile.uploadedAt)}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm(`Remove "${fileName}" from this budget?`)) {
                              filesWithName.forEach((f) => onDeleteFile(f.id))
                            }
                          }}
                          aria-label={`Delete ${fileName}`}
                          className="shrink-0 w-5 h-5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex items-center justify-center text-sm"
                        >
                          ×
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}

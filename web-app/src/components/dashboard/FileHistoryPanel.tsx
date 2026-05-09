import type { FileRecord } from '@/types'
import { formatShortDate } from '@/lib/format'

interface FileHistoryPanelProps {
  history: FileRecord[]
  activeId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

export default function FileHistoryPanel({
  history,
  activeId,
  onSelect,
  onDelete,
}: FileHistoryPanelProps) {
  return (
    <aside className="hidden md:block w-64 shrink-0 bg-white border-r border-gray-200 min-h-screen sticky top-0 overflow-y-auto">
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">History</h3>
      </div>

      <nav className="flex flex-col">
        {history.map((record) => {
          const isActive = record.id === activeId
          return (
            <div
              key={record.id}
              className={`group relative border-b border-gray-50 ${
                isActive ? 'bg-purple-50 border-l-2 border-l-purple-600' : ''
              }`}
            >
              <button
                onClick={() => onSelect(record.id)}
                className="w-full text-left px-4 py-3 pr-10 hover:bg-purple-50 transition-colors"
              >
                <p className="text-sm font-medium text-gray-800 truncate">{record.fileName}</p>
                <p className="text-xs text-gray-500 mt-0.5">{formatShortDate(record.uploadedAt)}</p>
                <p className="text-xs text-purple-600 capitalize mt-1">{record.accountType}</p>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm(`Remove "${record.fileName}" from history?`)) {
                    onDelete(record.id)
                  }
                }}
                aria-label={`Delete ${record.fileName}`}
                className="absolute top-3 right-2 w-6 h-6 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex items-center justify-center"
              >
                ×
              </button>
            </div>
          )
        })}
      </nav>
    </aside>
  )
}

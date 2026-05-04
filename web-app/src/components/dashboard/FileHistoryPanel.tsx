import type { FileRecord } from '../../types'

interface FileHistoryPanelProps {
  history: FileRecord[]
  activeId: string | null
  onSelect: (id: string) => void
}

export default function FileHistoryPanel({
  history,
  activeId,
  onSelect,
}: FileHistoryPanelProps) {
  const formatDate = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen sticky top-0 overflow-y-auto">
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">History</h3>
      </div>

      <nav className="flex flex-col">
        {history.map((record) => (
          <button
            key={record.id}
            onClick={() => onSelect(record.id)}
            className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-purple-50 transition-colors ${
              record.id === activeId ? 'bg-purple-50 border-l-2 border-l-purple-600' : ''
            }`}
          >
            <p className="text-sm font-medium text-gray-800 truncate">{record.fileName}</p>
            <p className="text-xs text-gray-400 mt-0.5">{formatDate(record.uploadedAt)}</p>
            <p className="text-xs text-purple-600 capitalize mt-1">{record.accountType}</p>
          </button>
        ))}
      </nav>
    </aside>
  )
}

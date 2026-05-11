import { useState, useMemo, useEffect } from 'react'
import type { FileRecord, AppView, AccountType } from '@/types'
import './App.css'
import UploadComponent from '@/components/UploadComponent'
import DashboardShell from '@/components/dashboard/DashboardShell'
import { loadHistory, saveHistory } from '@/lib/storage'
import { generateId } from '@/lib/format'
import { parseCSV } from '@/lib/csvParser'
import { consolidateByMonth } from '@/lib/consolidation'
function App() {
  const [fileHistory, setFileHistory] = useState<FileRecord[]>(() => loadHistory())
  const [activeMonth, setActiveMonth] = useState<string | null>(null)
  const [view, setView] = useState<AppView>('upload')

  const consolidations = useMemo(() => consolidateByMonth(fileHistory), [fileHistory])
  const activeConsolidation = activeMonth
    ? consolidations.find((c) => c.month === activeMonth)
    : consolidations[0]

  // Switch to dashboard once we have consolidated data
  useEffect(() => {
    if (consolidations.length > 0) {
      if (!activeMonth) setActiveMonth(consolidations[0].month)
      setView('dashboard')
    } else {
      setView('upload')
    }
  }, [consolidations, activeMonth])

  const handleFilesUpload = async (files: File[], accountType: AccountType, onError?: (msg: string) => void) => {
    let updated = [...fileHistory]
    const failedFiles: string[] = []
    for (const file of files) {
      try {
        const csvContent = await file.text()
        const { transactions } = parseCSV(csvContent, accountType)
        updated = [
          {
            id: generateId(),
            fileName: file.name,
            accountType,
            uploadedAt: new Date().toISOString(),
            analysisResult: { status: 'success', account_type: accountType, summary: { total_spent: 0, transaction_count: 0, date_range: '', average_transaction: 0 }, by_category: {}, insights: [], anomalies: [], top_merchants: [], transactions },
          },
          ...updated,
        ]
      } catch (error) {
        failedFiles.push(`${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    setFileHistory(updated)
    saveHistory(updated)
    if (failedFiles.length > 0 && onError) {
      onError(`Failed to upload ${failedFiles.length} file(s): ${failedFiles.join('; ')}`)
    }
  }

  const handleUploadAnother = () => {
    setView('upload')
  }

  const handleSelectMonth = (month: string) => {
    setActiveMonth(month)
    setView('dashboard')
  }

  const handleDeleteFile = (fileId: string) => {
    const updated = fileHistory.filter((r) => r.id !== fileId)
    setFileHistory(updated)
    saveHistory(updated)
    const newConsolidations = consolidateByMonth(updated)
    if (newConsolidations.length === 0) {
      setActiveMonth(null)
      setView('upload')
    } else if (!newConsolidations.find((c) => c.month === activeMonth)) {
      setActiveMonth(newConsolidations[0].month)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-light via-white to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {view === 'upload' || !activeConsolidation ? (
          <UploadComponent onUpload={handleFilesUpload} />
        ) : activeConsolidation ? (
          <DashboardShell
            consolidation={activeConsolidation}
            consolidations={consolidations}
            fileHistory={fileHistory}
            onUploadAnother={handleUploadAnother}
            onSelectMonth={handleSelectMonth}
            onDeleteFile={handleDeleteFile}
          />
        ) : null}
      </div>
    </div>
  )
}

export default App

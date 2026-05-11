import { useState, useMemo, useEffect } from 'react'
import type { FileRecord, AppView, AccountType } from '@/types'
import './App.css'
import UploadComponent from '@/components/UploadComponent'
import DashboardShell from '@/components/dashboard/DashboardShell'
import { loadHistory, saveHistory } from '@/lib/storage'
import { generateId } from '@/lib/format'
import { parseCSV } from '@/lib/csvParser'
import { consolidateByMonth } from '@/lib/consolidation'

type HistoryState = { appView: AppView }

function App() {
  const [fileHistory, setFileHistory] = useState<FileRecord[]>(() => loadHistory())
  const [activeMonth, setActiveMonth] = useState<string | null>(null)
  const [view, setView] = useState<AppView>('upload')

  const consolidations = useMemo(() => consolidateByMonth(fileHistory), [fileHistory])
  const activeConsolidation = activeMonth
    ? consolidations.find((c) => c.month === activeMonth)
    : consolidations[0]

  // Set initial history state on first load
  useEffect(() => {
    history.replaceState({ appView: 'upload' } as HistoryState, '')
  }, [])

  // Handle browser back/forward
  useEffect(() => {
    const handlePop = (e: PopStateEvent) => {
      const state = e.state as HistoryState | null
      if (state?.appView === 'upload') {
        setView('upload')
      } else if (state?.appView === 'dashboard') {
        setView('dashboard')
      }
    }
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [])

  // Switch to dashboard once we have data
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
    history.pushState({ appView: 'upload' } as HistoryState, '')
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

  // Push a dashboard history entry when transitioning from upload → dashboard
  const handleDashboardReady = () => {
    if (view === 'dashboard') {
      history.pushState({ appView: 'dashboard' } as HistoryState, '')
    }
  }

  return (
    <div className="bg-gradient-to-br from-brand-light via-white to-white">
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
            onDashboardReady={handleDashboardReady}
          />
        ) : null}
      </div>
    </div>
  )
}

export default App

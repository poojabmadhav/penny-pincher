import { useState, useMemo, useEffect } from 'react'
import type { FileRecord, AppView, AccountType, AnalysisResult } from '@/types'
import './App.css'
import UploadComponent from '@/components/UploadComponent'
import DashboardShell from '@/components/dashboard/DashboardShell'
import { loadHistory, saveHistory } from '@/lib/storage'
import { generateId } from '@/lib/format'
import { parseCSV } from '@/lib/csvParser'
import { consolidateByMonth } from '@/lib/consolidation'
import { MOCK_ANALYSIS_RESULT } from '@/data/mockAnalysis'

function App() {
  const [fileHistory, setFileHistory] = useState<FileRecord[]>(() => loadHistory())
  const [activeMonth, setActiveMonth] = useState<string | null>(null)
  const [view, setView] = useState<AppView>(() =>
    fileHistory.length > 0 ? 'dashboard' : 'upload',
  )

  const consolidations = useMemo(() => consolidateByMonth(fileHistory), [fileHistory])
  const activeConsolidation = activeMonth ? consolidations.find((c) => c.month === activeMonth) : consolidations[0]

  // Set active month when consolidations change
  useEffect(() => {
    if (!activeMonth && consolidations.length > 0) {
      setActiveMonth(consolidations[0].month)
    }
  }, [consolidations, activeMonth])

  const handleFileUpload = async (file: File, accountType: AccountType) => {
    try {
      const csvContent = await file.text()
      const { transactions } = parseCSV(csvContent)

      // For now, use mock analysis with parsed transactions
      const analysisResult: AnalysisResult = {
        ...MOCK_ANALYSIS_RESULT,
        account_type: accountType,
        transactions,
      }

      const id = generateId()
      const newRecord: FileRecord = {
        id,
        fileName: file.name,
        accountType,
        uploadedAt: new Date().toISOString(),
        analysisResult,
      }
      const updated = [newRecord, ...fileHistory]
      setFileHistory(updated)
      setView('dashboard')
      saveHistory(updated)
    } catch (error) {
      console.error('Error parsing CSV:', error)
      // Fall back to mock data on parse error
      const id = generateId()
      const newRecord: FileRecord = {
        id,
        fileName: file.name,
        accountType,
        uploadedAt: new Date().toISOString(),
        analysisResult: MOCK_ANALYSIS_RESULT,
      }
      const updated = [newRecord, ...fileHistory]
      setFileHistory(updated)
      setView('dashboard')
      saveHistory(updated)
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {view === 'upload' ? (
          <UploadComponent onUpload={handleFileUpload} />
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

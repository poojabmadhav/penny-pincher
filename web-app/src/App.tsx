import { useState } from 'react'
import type { FileRecord, AppView, AccountType, AnalysisResult } from '@/types'
import './App.css'
import UploadComponent from '@/components/UploadComponent'
import DashboardShell from '@/components/dashboard/DashboardShell'
import { loadHistory, saveHistory } from '@/lib/storage'
import { generateId } from '@/lib/format'
import { parseCSV } from '@/lib/csvParser'
import { MOCK_ANALYSIS_RESULT } from '@/data/mockAnalysis'

function App() {
  const [fileHistory, setFileHistory] = useState<FileRecord[]>(() => loadHistory())
  const [activeRecordId, setActiveRecordId] = useState<string | null>(
    () => fileHistory[0]?.id ?? null,
  )
  const [view, setView] = useState<AppView>(() =>
    fileHistory.length > 0 ? 'dashboard' : 'upload',
  )

  const activeRecord = fileHistory.find((r) => r.id === activeRecordId)

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
      setActiveRecordId(id)
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
      setActiveRecordId(id)
      setView('dashboard')
      saveHistory(updated)
    }
  }

  const handleUploadAnother = () => {
    setView('upload')
  }

  const handleSelectRecord = (id: string) => {
    setActiveRecordId(id)
    setView('dashboard')
  }

  const handleDeleteRecord = (id: string) => {
    const updated = fileHistory.filter((r) => r.id !== id)
    setFileHistory(updated)
    saveHistory(updated)
    if (id === activeRecordId) {
      if (updated.length > 0) {
        setActiveRecordId(updated[0].id)
      } else {
        setActiveRecordId(null)
        setView('upload')
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {view === 'upload' ? (
          <UploadComponent onUpload={handleFileUpload} />
        ) : activeRecord ? (
          <DashboardShell
            record={activeRecord}
            fileHistory={fileHistory}
            onUploadAnother={handleUploadAnother}
            onSelectRecord={handleSelectRecord}
            onDeleteRecord={handleDeleteRecord}
          />
        ) : null}
      </div>
    </div>
  )
}

export default App

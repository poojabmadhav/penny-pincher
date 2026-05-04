import { useEffect, useState } from 'react'
import type { FileRecord, AppView, AccountType } from './types'
import './App.css'
import UploadComponent from './components/UploadComponent'
import DashboardShell from './components/dashboard/DashboardShell'
import { loadHistory, saveHistory } from './lib/storage'
import { MOCK_ANALYSIS_RESULT } from './data/mockAnalysis'

function App() {
  const [view, setView] = useState<AppView>('upload')
  const [fileHistory, setFileHistory] = useState<FileRecord[]>([])
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null)

  useEffect(() => {
    const history = loadHistory()
    setFileHistory(history)
    if (history.length > 0) {
      setActiveRecordId(history[0].id)
      setView('dashboard')
    }
  }, [])

  const activeRecord = fileHistory.find(r => r.id === activeRecordId)

  const handleFileUpload = (file: File, accountType: AccountType) => {
    const id = crypto.randomUUID()
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
    console.log('File uploaded:', file.name, 'Type:', accountType)
  }

  const handleUploadAnother = () => {
    setView('upload')
  }

  const handleSelectRecord = (id: string) => {
    setActiveRecordId(id)
    setView('dashboard')
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
          />
        ) : null}
      </div>
    </div>
  )
}

export default App

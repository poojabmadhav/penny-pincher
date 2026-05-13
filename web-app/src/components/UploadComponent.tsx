import { useRef, useState } from 'react'
import type { AccountType } from '@/types'

interface UploadComponentProps {
  onUpload: (files: File[], accountType: AccountType, onError?: (msg: string) => void) => Promise<void>
}

export default function UploadComponent({ onUpload }: UploadComponentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)
  const [dragActive, setDragActive] = useState(false)
  const selectedType: AccountType = 'personal'
  const [fileNames, setFileNames] = useState<string[]>([])
  const [error, setError] = useState<string>('')

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current += 1
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current -= 1
    if (dragCounter.current <= 0) {
      dragCounter.current = 0
      setDragActive(false)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current = 0
    setDragActive(false)
    if (e.dataTransfer.files) handleFiles(Array.from(e.dataTransfer.files))
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(Array.from(e.target.files))
  }

  const handleFiles = async (files: File[]) => {
    const csvFiles = files.filter(
      (f) => f.type === 'text/csv' || f.name.toLowerCase().endsWith('.csv'),
    )
    const rejected = files.length - csvFiles.length
    if (csvFiles.length === 0) {
      setError('No CSV files found. Please choose .csv exports from your bank.')
      return
    }
    setError(rejected > 0 ? `${rejected} non-CSV file(s) skipped.` : '')
    setFileNames(csvFiles.map((f) => f.name))

    await onUpload(csvFiles, selectedType, (errorMsg) => {
      setError(errorMsg)
      setFileNames([])
    })

    setFileNames([])
  }

  const openFilePicker = () => fileInputRef.current?.click()

  return (
    <div className="py-8 md:py-14">
      {/* Hero Section */}
      <div className="text-center mb-8">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
          PennyPincher
        </h1>
        <p className="text-lg md:text-xl text-brand-mid max-w-xl mx-auto flex items-center justify-center gap-1.5">
          <span>🔒</span>
          Track where your pennies roll while your data stays on your device.
        </p>
      </div>

      {/* Upload Area */}
      <div className="max-w-2xl mx-auto">
        {/* Drag and Drop Area */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload CSV file"
          onClick={openFilePicker}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              openFilePicker()
            }
          }}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`relative rounded-2xl border-2 border-dashed transition-all p-12 text-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-mid focus:ring-offset-2 ${
            dragActive
              ? 'border-brand-dark bg-brand-light'
              : 'border-brand-mid bg-brand-light hover:border-brand-dark'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            multiple
            onChange={handleChange}
            className="hidden"
          />

          {/* Icon */}
          <div className="mb-4">
            <svg
              className="w-16 h-16 mx-auto text-brand-mid"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          {fileNames.length > 0 ? (
            <div>
              {fileNames.map((name) => (
                <p key={name} className="text-sm font-semibold text-gray-900">✓ {name}</p>
              ))}
              <p className="text-sm text-gray-500 mt-1">Analyzing...</p>
            </div>
          ) : (
            <>
              <p className="text-lg font-semibold text-gray-900 mb-3">
                Drag your CSV files here
              </p>
              <p className="text-sm text-gray-600 max-w-md mx-auto">
                Drag a .csv file of your financial transactions here for analysis. Data is all yours and not saved or uploaded anywhere beyond your device.
              </p>
            </>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              openFilePicker()
            }}
            className="mt-6 px-6 py-2 bg-brand-accent text-brand-dark rounded-lg hover:bg-brand-mid hover:text-white transition-colors font-medium"
          >
            {fileNames.length > 0 ? 'Add More Files' : 'Select Files'}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-3xl font-bold text-brand-mid mb-2">🔒</div>
            <h3 className="font-semibold text-gray-900 mb-1">100% Private</h3>
            <p className="text-sm text-gray-600">
              Your data stays on your device. No cloud storage.
            </p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-brand-mid mb-2">⚡</div>
            <h3 className="font-semibold text-gray-900 mb-1">Instant Analysis</h3>
            <p className="text-sm text-gray-600">
              Get insights in seconds, not hours.
            </p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-brand-mid mb-2">💾</div>
            <h3 className="font-semibold text-gray-900 mb-1">Local History</h3>
            <p className="text-sm text-gray-600">
              Keep track of all your analyses locally.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

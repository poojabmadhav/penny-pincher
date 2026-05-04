import { useRef, useState } from 'react'

interface UploadComponentProps {
  onUpload: (file: File, accountType: 'personal' | 'business') => void
}

export default function UploadComponent({ onUpload }: UploadComponentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [selectedType, setSelectedType] = useState<'personal' | 'business'>('personal')
  const [fileName, setFileName] = useState<string>('')

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleFile(files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (file: File) => {
    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      setFileName(file.name)
      onUpload(file, selectedType)
    } else {
      alert('Please upload a CSV file')
    }
  }

  return (
    <div className="py-12 md:py-24">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
          PennyPincher
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Understand your spending. Keep your privacy. No bank connections needed.
        </p>
      </div>

      {/* Upload Area */}
      <div className="max-w-2xl mx-auto">
        {/* Account Type Selector */}
        <div className="mb-8 flex gap-4 justify-center">
          <button
            onClick={() => setSelectedType('personal')}
            className={`px-6 py-3 rounded-full font-medium transition-all ${
              selectedType === 'personal'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            Personal
          </button>
          <button
            onClick={() => setSelectedType('business')}
            className={`px-6 py-3 rounded-full font-medium transition-all ${
              selectedType === 'business'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            Business
          </button>
        </div>

        {/* Drag and Drop Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative rounded-2xl border-2 border-dashed transition-all p-12 text-center cursor-pointer ${
            dragActive
              ? 'border-purple-500 bg-purple-50 scale-105'
              : 'border-gray-300 bg-white hover:border-purple-400 hover:bg-purple-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleChange}
            className="hidden"
          />

          {/* Icon */}
          <div className="mb-4">
            <svg
              className="w-16 h-16 mx-auto text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          {fileName ? (
            <div>
              <p className="text-lg font-semibold text-gray-900 mb-1">
                ✓ {fileName}
              </p>
              <p className="text-sm text-gray-600">Ready to analyze</p>
            </div>
          ) : (
            <>
              <p className="text-lg font-semibold text-gray-900 mb-1">
                Drag your CSV file here
              </p>
              <p className="text-sm text-gray-600 mb-4">
                or click to select from your computer
              </p>
              <p className="text-xs text-gray-500">
                Supports Wells Fargo, American Express, and standard CSV formats
              </p>
            </>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-6 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            {fileName ? 'Choose Different File' : 'Select File'}
          </button>
        </div>

        {/* Info Section */}
        <div className="mt-12 grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">🔒</div>
            <h3 className="font-semibold text-gray-900 mb-1">100% Private</h3>
            <p className="text-sm text-gray-600">
              Your data stays on your device. No cloud storage.
            </p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">⚡</div>
            <h3 className="font-semibold text-gray-900 mb-1">Instant Analysis</h3>
            <p className="text-sm text-gray-600">
              Get insights in seconds, not hours.
            </p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">💾</div>
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

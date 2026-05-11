interface DateRangeSelectorProps {
  dateSelection: 'this-month' | 'year-to-date' | 'all-data' | 'custom'
  setDateSelection: (val: 'this-month' | 'year-to-date' | 'all-data' | 'custom') => void
  selectedYears: number[]
  setSelectedYears: (years: number[]) => void
  availableYears: number[]
  customStart: string
  setCustomStart: (val: string) => void
  customEnd: string
  setCustomEnd: (val: string) => void
}

export default function DateRangeSelector({
  dateSelection,
  setDateSelection,
  selectedYears,
  setSelectedYears,
  availableYears,
  customStart,
  setCustomStart,
  customEnd,
  setCustomEnd,
}: DateRangeSelectorProps) {
  function toggleYear(year: number) {
    if (selectedYears.includes(year)) {
      setSelectedYears(selectedYears.filter((y) => y !== year))
    } else {
      setSelectedYears([...selectedYears, year])
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 space-y-3">
      {/* Row 1: date mode buttons + year chips */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Date mode buttons */}
        {(['this-month', 'year-to-date', 'all-data', 'custom'] as const).map((option) => (
          <button
            key={option}
            onClick={() => setDateSelection(option)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              dateSelection === option
                ? 'bg-brand-accent text-brand-dark'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {option === 'this-month' && 'This Month'}
            {option === 'year-to-date' && 'Year to Date'}
            {option === 'all-data' && 'All Data'}
            {option === 'custom' && 'Custom'}
          </button>
        ))}

        {/* Separator */}
        {availableYears.length > 0 && (
          <span className="text-gray-200 text-lg select-none">|</span>
        )}

        {/* All Years chip */}
        {availableYears.length > 0 && (
          <button
            onClick={() => setSelectedYears([])}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedYears.length === 0
                ? 'bg-brand-accent text-brand-dark'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            All Years
          </button>
        )}

        {/* Per-year chips */}
        {availableYears.map((year) => (
          <button
            key={year}
            onClick={() => toggleYear(year)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedYears.includes(year)
                ? 'bg-brand-accent text-brand-dark'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {year}
          </button>
        ))}
      </div>

      {/* Custom date range inputs */}
      {dateSelection === 'custom' && (
        <div className="flex gap-4 pt-2 border-t border-gray-100">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Start Date</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">End Date</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid"
            />
          </div>
        </div>
      )}
    </div>
  )
}

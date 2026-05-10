export type AccountType = 'personal' | 'business'

export type InsightType = 'recurring' | 'category_spike' | 'unusual' | 'amazon' | 'info'

export interface Insight {
  type: InsightType
  message: string
  detail?: string
  amount?: number
}
export type AppView = 'upload' | 'dashboard'
export type Trend = 'up' | 'down' | 'stable' | 'insufficient_data'

export interface Transaction {
  date: string
  merchant: string
  amount: number
  description: string
  source: string
  original_category?: string
  user_category?: string
  type?: AccountType
}

export interface MerchantData {
  merchant: string
  total: number
}

export interface CategoryData {
  total: number
  count: number
  average_transaction: number
  trend: Trend
  top_merchants: MerchantData[]
}

export interface AnalysisResult {
  status: 'success' | 'error'
  account_type: AccountType
  summary: {
    total_spent: number
    transaction_count: number
    date_range: string
    average_transaction: number
  }
  by_category: Record<string, CategoryData>
  insights: Insight[]
  anomalies: Array<{
    date: string
    merchant: string
    amount: number
    category: string
    description: string
    reason: string
  }>
  top_merchants: Array<{
    merchant: string
    total: number
    count: number
  }>
  transactions: Transaction[]
}

export interface FileRecord {
  id: string
  fileName: string
  accountType: AccountType
  uploadedAt: string
  analysisResult: AnalysisResult | null
}

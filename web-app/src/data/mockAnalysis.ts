import type { AnalysisResult } from '../types'

export const MOCK_ANALYSIS_RESULT: AnalysisResult = {
  status: 'success',
  account_type: 'personal',
  summary: {
    total_spent: -8428.06,
    transaction_count: 37,
    date_range: '2024-08-23 to 2024-09-21',
    account_type: 'personal',
    average_transaction: -227.79,
  },
  by_category: {
    Travel: {
      total: -6094.59,
      count: 5,
      percentage: 0,
      average_transaction: -1218.92,
      trend: 'down',
      top_merchants: [
        {
          merchant: 'EMIRATES 62377875946-2800-7773999 NY',
          total: -4230.48,
        },
        {
          merchant: 'EMIRATES MUMBAI',
          total: -1539.33,
        },
        {
          merchant: 'VFS Services USA',
          total: -324.78,
        },
      ],
    },
    Healthcare: {
      total: -1045.78,
      count: 4,
      percentage: 0,
      average_transaction: -261.44,
      trend: 'down',
      top_merchants: [
        {
          merchant: 'SOUTH ORANGE COUNTY',
          total: -1012.48,
        },
        {
          merchant: 'INTECORE PHYSICAL THER',
          total: -33.3,
        },
      ],
    },
    Shopping: {
      total: -764.32,
      count: 16,
      percentage: 0,
      average_transaction: -47.77,
      trend: 'down',
      top_merchants: [
        {
          merchant: 'Amazon.com*RK3465QH0 Amzn.com/billWA',
          total: -142.14,
        },
        {
          merchant: 'AMAZON RETA* R46V023N1',
          total: -87.28,
        },
        {
          merchant: 'AMAZON MARK* RK3HG06G2',
          total: -86.19,
        },
      ],
    },
    Other: {
      total: -256.78,
      count: 4,
      percentage: 0,
      average_transaction: -64.2,
      trend: 'down',
      top_merchants: [
        {
          merchant: 'ECOMM TAX SERVICE',
          total: -99.0,
        },
        {
          merchant: 'INTEREST CHARGED ON',
          total: -72.61,
        },
        {
          merchant: 'FOREIGN TRANSACTION FEE',
          total: -46.17,
        },
      ],
    },
    'Food & Dining': {
      total: -216.47,
      count: 3,
      percentage: 0,
      average_transaction: -72.16,
      trend: 'up',
      top_merchants: [
        {
          merchant: 'UBER *EATS HELP.UBER.COMCA',
          total: -185.29,
        },
        {
          merchant: 'COYOTE GRILL LAGUNA',
          total: -31.18,
        },
      ],
    },
    Subscriptions: {
      total: -39.14,
      count: 2,
      percentage: 0,
      average_transaction: -19.57,
      trend: 'down',
      top_merchants: [
        {
          merchant: 'Netflix 1 8445052993',
          total: -22.99,
        },
        {
          merchant: 'Amazon Prime*HE5F93MD3 Amzn.com/billWA',
          total: -16.15,
        },
      ],
    },
    Entertainment: {
      total: -6.98,
      count: 2,
      percentage: 0,
      average_transaction: -3.49,
      trend: 'up',
      top_merchants: [
        {
          merchant: 'Prime Video *533JM9IR3',
          total: -5.99,
        },
        {
          merchant: 'Prime Video *R49927P41',
          total: -0.99,
        },
      ],
    },
    Education: {
      total: -4.0,
      count: 1,
      percentage: 0,
      average_transaction: -4.0,
      trend: 'insufficient_data',
      top_merchants: [
        {
          merchant: 'KHAN ACADEMY HTTPSWWW.KHANCA',
          total: -4.0,
        },
      ],
    },
  },
  insights: [
    'Highest spending category: Travel ($6094.59)',
    'Recurring merchants account for $358.08 across 2 merchants',
    'Total inflow: $178.00',
    'Total outflow: $8606.06',
  ],
  anomalies: [
    {
      date: '2024-08-30',
      merchant: 'EMIRATES 62377875946-2800-7773999 NY',
      amount: -4230.48,
      category: 'Travel',
      description: 'EMIRATES 62377875946-2800-7773999 NY',
      reason: 'Unusually large outflow (17.7x average)',
    },
    {
      date: '2024-08-31',
      merchant: 'EMIRATES MUMBAI',
      amount: -1539.33,
      category: 'Travel',
      description: 'EMIRATES MUMBAI',
      reason: 'Unusually large outflow (6.4x average)',
    },
    {
      date: '2024-08-30',
      merchant: 'SOUTH ORANGE COUNTY',
      amount: -1012.48,
      category: 'Healthcare',
      description: 'SOUTH ORANGE COUNTY SURGI949-4577900 CA',
      reason: 'Unusually large outflow (4.2x average)',
    },
  ],
  top_merchants: [
    {
      merchant: 'EMIRATES 62377875946-2800-7773999 NY',
      total: -4230.48,
      count: 1,
    },
    {
      merchant: 'EMIRATES MUMBAI',
      total: -1539.33,
      count: 1,
    },
    {
      merchant: 'SOUTH ORANGE COUNTY',
      total: -1012.48,
      count: 1,
    },
    {
      merchant: 'VFS Services USA',
      total: -324.78,
      count: 3,
    },
    {
      merchant: 'UBER *EATS HELP.UBER.COMCA',
      total: -185.29,
      count: 2,
    },
  ],
}

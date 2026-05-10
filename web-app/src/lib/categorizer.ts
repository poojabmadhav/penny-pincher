import type { AccountType } from '@/types'

type RuleSet = [RegExp, string][]

// Transfer/income rules run FIRST — bank transfers, payroll, autopay must not be miscategorized
const TRANSFER_RULES: RuleSet = [
  [/wire\s*trans|wt\s*fed|ach\s*transfer|online\s*transfer|transfer\s*(to|from|out|in)/i, 'Transfer'],
  [/americanexpress\s*transfer|amex\s*payment|american\s*express\s*transfer/i, 'Transfer'],
  [/autopay\s*payment|bill\s*pay|auto\s*pay|e-?payment|epayment/i, 'Transfer'],
  [/citi\s*autopay|chase\s*autopay|bofa\s*autopay|bank\s*of\s*america\s*autopay/i, 'Transfer'],
  [/community\s*federal|coastal\s*community|capital\s*corp|regalis/i, 'Transfer'],
  [/payroll|direct\s*dep|slalom|w2\s*payment|salary|wages/i, 'Transfer'],
  [/zelle|cashapp|cash\s*app/i, 'Transfer'],
]

const PERSONAL_RULES: RuleSet = [
  // Food & Dining — delivery first
  [/instacart|doordash|grubhub|uber.?eat|postmates|seamless|caviar/i, 'Food & Dining'],
  [/starbucks|dunkin|peet.?s|coffee|cafe|bakery|panera|dutch\s*bros/i, 'Food & Dining'],
  [/mcdonald|chipotle|subway|domino|pizza|burger|taco.?bell|wendys|chick.?fil|in.?n.?out/i, 'Food & Dining'],
  [/restaurant|dining|sushi|ramen|pho|grill|bistro|kitchen|eatery|diner|thai|chinese|indian|mexican|boba|noodle|bbq/i, 'Food & Dining'],
  [/whole.?foods|trader.?joe|safeway|kroger|vons|ralphs|sprouts|aldi|publix|wegmans|market|grocery|supermarket/i, 'Food & Dining'],

  // Transportation — explicit transport, NOT large corporate payments
  [/uber(?!.?eat)|lyft|waymo|taxi|cab\b/i, 'Transportation'],
  [/chevron|arco|exxon|mobil\b|bp\b|gas.?station|76\b|valero|shell(?!\s*(llc|corp|inc|pay|service\s+charge))/i, 'Transportation'],
  [/parking|parkway|park.?plus|spothero|parkwhiz/i, 'Transportation'],
  [/bart|caltrain|metro|muni|transit|clipper\s*card|amtrak|greyhound/i, 'Transportation'],
  [/enterprise\s*rent|hertz|avis|budget\s*car|zipcar|turo/i, 'Transportation'],

  // Travel
  [/airlines?|united\s*air|delta\s*air|american\s*air|southwest|jetblue|alaska\s*air|spirit\s*air|frontier|emirates/i, 'Travel'],
  [/airbnb|vrbo|booking\.com|expedia|hotels?\.com|marriott|hilton|hyatt|sheraton|ritz|westin/i, 'Travel'],
  [/\bhotel\b|motel|resort|\binn\b|suites?\b/i, 'Travel'],
  [/vfs\b|visa.?center|passport/i, 'Travel'],

  // Subscriptions
  [/netflix|hulu|disney\+|disney\s*plus|hbo\s*max|peacock|paramount\+|apple.?tv/i, 'Subscriptions'],
  [/spotify|apple.?music|tidal|pandora|youtube.?premium|soundcloud/i, 'Subscriptions'],
  [/amazon.?prime|prime.?membership/i, 'Subscriptions'],
  [/icloud|google\s*one|dropbox|adobe\s*cc|adobe\s*creative|canva/i, 'Subscriptions'],

  // Entertainment
  [/cinema|movie|\btheater\b|\btheatre\b|\bamc\b|regal|imax|fandango/i, 'Entertainment'],
  [/concert|ticketmaster|stubhub|eventbrite|live.?nation/i, 'Entertainment'],
  [/\bsteam\b|playstation|xbox|nintendo/i, 'Entertainment'],

  // Shopping — Amazon before generic rules
  [/amazon\.com|amazon\*|amzn\.com/i, 'Shopping'],
  [/target|walmart|costco(?!\s*gas)|sam.?s.?club/i, 'Shopping'],
  [/best.?buy|apple\s*store|apple\.com\/shop|microsoft\s*store/i, 'Shopping'],
  [/nordstrom|macys|bloomingdale|neiman|saks|tj.?maxx|marshalls|\bross\b/i, 'Shopping'],
  [/etsy|ebay|wayfair|overstock/i, 'Shopping'],

  // Healthcare
  [/walgreens|cvs|rite.?aid|duane.?reade/i, 'Healthcare'],
  [/hospital|medical|clinic|urgent.?care|dental|optom|vision\s*care|eye\s*care/i, 'Healthcare'],
  [/physical.?ther|therapy|counseling|psycholog|psychiatr/i, 'Healthcare'],
  [/anthem|blue.?cross|kaiser|aetna|cigna|united.?health|health\s*insurance/i, 'Healthcare'],
  [/south\s*orange\s*county|intecore/i, 'Healthcare'],

  // Utilities & Phone
  [/at&t|verizon|t.?mobile|sprint|comcast|xfinity|spectrum|\bcox\b/i, 'Utilities'],
  [/pg&e|sdge|con.?ed|national.?grid|so\s*cal\s*edison|socal\s*gas|directpay/i, 'Utilities'],

  // Personal Care
  [/salon|haircut|barbershop|\bspa\b|\bnail\b|beauty|sephora|ulta|massage/i, 'Personal Care'],
  [/gym|fitness|planet.?fitness|equinox|crossfit|yoga|peloton/i, 'Personal Care'],

  // Education
  [/udemy|coursera|skillshare|linkedin.?learning|pluralsight|masterclass/i, 'Education'],
  [/university|college|tuition|school/i, 'Education'],

  // Home
  [/home.?depot|lowes|ace.?hardware|ikea/i, 'Home & Garden'],

  // Gifts & Donations
  [/charity|donation|nonprofit|foundation|gofundme/i, 'Gifts & Donations'],

  // Insurance
  [/geico|state.?farm|allstate|progressive|nationwide|farmers\s*ins/i, 'Insurance'],
]

const BUSINESS_RULES: RuleSet = [
  [/aws|amazon.?web\s*services|google\s*cloud|azure|digitalocean|heroku|vercel|netlify|cloudflare/i, 'Cloud Services'],
  [/github|gitlab|jira|confluence|notion|linear|figma|slack|zoom|loom|asana/i, 'Software Expenses'],
  [/gusto|rippling|adp|paychex/i, 'Payroll'],
  [/doordash|grubhub|uber.?eat|restaurant|dining|catering/i, 'Business Meals'],
  [/airlines?|hotel|airbnb|uber|lyft/i, 'Travel'],
  [/staples|office.?depot/i, 'Office Supplies'],
  [/google.?ads|facebook.?ads|meta.?ads|linkedin.?ads|mailchimp|hubspot/i, 'Marketing & Advertising'],
  [/lawyer|legal|attorney|legalzoom/i, 'Legal & Compliance'],
]

export function categorize(merchant: string, description: string, accountType: AccountType): string {
  const text = `${merchant} ${description}`.trim()

  for (const [pattern, category] of TRANSFER_RULES) {
    if (pattern.test(text)) return category
  }

  const rules = accountType === 'business' ? [...BUSINESS_RULES, ...PERSONAL_RULES] : PERSONAL_RULES
  for (const [pattern, category] of rules) {
    if (pattern.test(text)) return category
  }

  return 'Other'
}

// Categories that count as real spending (not transfers/income)
export const SPENDING_CATEGORIES = new Set([
  'Food & Dining', 'Transportation', 'Travel', 'Shopping', 'Subscriptions',
  'Entertainment', 'Healthcare', 'Utilities', 'Personal Care', 'Education',
  'Home & Garden', 'Gifts & Donations', 'Insurance', 'Other',
  'Business Meals', 'Cloud Services', 'Software Expenses', 'Office Supplies',
  'Marketing & Advertising', 'Legal & Compliance',
])

export function isSpendingCategory(category: string): boolean {
  return SPENDING_CATEGORIES.has(category)
}

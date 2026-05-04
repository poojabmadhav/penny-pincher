# Privacy Budget MVP

**A privacy-first budgeting assistant that analyzes spending without bank connections.**

## Overview

Privacy Budget helps you understand your financial patterns by analyzing bank statements you upload as CSV files. No bank API connections, no data in the cloud—everything stays on your computer.

**What it does:**
1. Parse bank statements (Wells Fargo, American Express)
2. Auto-categorize transactions with learning
3. Analyze spending patterns and anomalies
4. Create personalized budget recommendations
5. Save plans with timestamps for tracking

## Key Features

✅ **Privacy First**
- No bank account connections required
- All processing is local
- CSV uploads only
- Works offline

✅ **Intelligent Categorization**
- Auto-classifies transactions using Claude
- Learns from your corrections
- Detects conflicting categorizations (same merchant, different categories)
- Persists learned mappings locally

✅ **Spending Insights**
- Spending by category with trends
- Anomaly detection (unusual transactions)
- Top merchants and recurring expenses
- Actionable recommendations

✅ **Budget Planning**
- Category-specific optimization suggestions
- Savings potential calculation
- Personal and business modes
- Projected future budgets

## Installation

### Requirements
- Python 3.9+
- Claude API key (from https://console.anthropic.com)

### Setup

1. **Clone or download the repository**
```bash
cd ~/projects/privacy-budget-mvp
```

2. **Create a Python virtual environment**
```bash
python3 -m venv venv
source venv/bin/activate
```

3. **Install dependencies**
```bash
pip install anthropic
```

4. **Set your API key**
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

5. **Verify installation**
```bash
python3 privacy_budget.py --help
```

## Quick Start

### Step 1: Parse Your Statement

Export a statement from your bank as CSV (usually from the "Transactions" or "Download" section).

```bash
python3 privacy_budget.py parse ~/Downloads/april_2026_checking.csv
```

Output: `april_2026_checking_parsed.json` (structured transactions)

### Step 2: Review & Categorize

The system auto-categorizes all transactions. Review corrections if needed:

```bash
python3 privacy_budget.py categorize april_2026_checking_parsed.json personal
```

Output: `april_2026_checking_categorized.json` (with categories and confidence)

If there are conflicts or low-confidence items, you can provide corrections:

```bash
# corrections.json
{
  "Slack": "Software Expenses",
  "Starbucks": "Business Meals"
}

python3 privacy_budget.py categorize april_2026_checking_parsed.json personal --corrections corrections.json
```

### Step 3: Analyze Spending

Get insights into your spending patterns:

```bash
python3 privacy_budget.py analyze april_2026_checking_categorized.json personal
```

Output: `april_2026_checking_analysis.json` (insights, anomalies, trends)

### Step 4: Create Budget Plan

Get personalized budget recommendations:

```bash
python3 privacy_budget.py plan april_2026_checking_analysis.json personal
```

Output: `april_2026_checking_personal_budget.json` (budget plan with next steps)

**Optional: Add constraints**
```bash
# constraints.json
{
  "monthly_income": 5000,
  "savings_goal": 800,
  "priority_goals": ["reduce_dining", "increase_savings"]
}

python3 privacy_budget.py plan april_2026_checking_analysis.json personal --constraints constraints.json
```

## Supported CSV Formats

### Wells Fargo Checking
```
"12/27/2024","-150.00","*","","AMERICANEXPRESS TRANSFER..."
"12/24/2024","-100.00","*","","VENMO PAYMENT..."
```

### American Express Business/Savings
```
Date,Description,Status,Currency,Amount,Ending Balance,Reference
3/31/2024,Interest Deposit,Posted,USD,1.20,1104.64,9001534486578
2/29/2024,Interest Deposit,Posted,USD,1.12,1103.44,9001283474987
```

## Category Templates

### Personal Categories
- Food & Dining
- Transportation
- Utilities
- Entertainment
- Shopping
- Healthcare
- Education
- Travel
- And more...

### Business Categories
- Payroll
- Software Expenses
- Cloud Services
- Professional Services
- Marketing & Advertising
- Office Supplies
- Travel
- Business Meals
- And more...

## How Learning Works

Privacy Budget learns from your corrections and remembers them:

**Session 1:**
```
Parser: Slack → (no category)
Categorizer (Claude): Slack → "Software"
You: (accept suggestion)
System: Learns "Slack → Software Expenses"
```

**Session 2 (next month):**
```
Parser: Slack → (no category)
Categorizer: Looks up learned mapping → "Software Expenses"
System: Automatically classifies, no need for correction
```

**Conflict Detection:**
```
Session 1: You classify Starbucks → "Food & Dining"
Session 2: You classify Starbucks → "Business Meals"
System: ⚠️ Detects conflict
System: Asks which is correct
You: "Business Meals"
System: Resolves conflict, all Starbucks now → "Business Meals"
```

## Managing Learned Mappings

### View Learned Classifications

```bash
python3 privacy_budget.py show-state personal
```

Output:
```
Classifier State for personal:
✓ Learned mappings: 47
✓ Unresolved conflicts: 0

Learned Classifications:
  Slack → Software Expenses (confidence: 0.95)
  Starbucks → Business Meals (confidence: 0.90)
  AWS → Cloud Services (confidence: 0.95)
  ...
```

### Reset State (Start Fresh)

```bash
python3 privacy_budget.py reset-state personal
# All learned mappings deleted, classifier starts fresh
```

## Output Files

Each command creates a timestamped JSON output file:

1. **Parsed transactions**: `{date}_parsed.json`
   - Raw extracted data from CSV
   - Used as input to categorizer

2. **Categorized transactions**: `{date}_categorized.json`
   - Transactions with categories and confidence scores
   - Used as input to analyzer

3. **Analysis results**: `{date}_analysis.json`
   - Spending by category with trends
   - Anomalies and insights
   - Top merchants

4. **Budget plan**: `{date}_{type}_budget.json`
   - Current spending breakdown
   - Category recommendations
   - Savings potential
   - Next action items

All JSON files can be reviewed, shared, or used as reference.

## Typical Workflows

### Personal Monthly Review
```bash
# Monday morning: New month, review spending
python3 privacy_budget.py parse ~/bank_april.csv
python3 privacy_budget.py categorize april_parsed.json personal
python3 privacy_budget.py analyze april_categorized.json personal
python3 privacy_budget.py plan april_analysis.json personal
# Review april_personal_budget.json
```

### Business Quarterly Expense Analysis
```bash
# End of quarter: Analyze business expenses
python3 privacy_budget.py parse ~/business_q2.csv
python3 privacy_budget.py categorize q2_parsed.json business
python3 privacy_budget.py analyze q2_categorized.json business
python3 privacy_budget.py plan q2_analysis.json business
# Review q2_business_budget.json for optimization
```

### Compare Month-to-Month
```bash
# Month 1
python3 privacy_budget.py parse ~/april.csv
# ... full pipeline ...
# Review april_personal_budget.json

# Month 2
python3 privacy_budget.py parse ~/may.csv
# ... full pipeline ...
# Compare may_personal_budget.json to april plan
# See what categories you stayed under/over
```

## Troubleshooting

### "Could not detect CSV format"
- Ensure CSV is exported from Wells Fargo or American Express
- Check that file has proper quotes and column alignment
- Try opening in Excel to verify format

### "No transactions found"
- Verify CSV has data rows (not just headers)
- Check that dates are in MM/DD/YYYY format
- Ensure amounts are numeric (not text)

### "ModuleNotFoundError: anthropic"
- Activate your virtual environment: `source venv/bin/activate`
- Install package: `pip install anthropic`

### "ANTHROPIC_API_KEY not set"
- Set API key: `export ANTHROPIC_API_KEY="your-key"`
- Verify: `echo $ANTHROPIC_API_KEY` (should print your key)

### Categorizer is slow
- First run processes all transactions with Claude (slower)
- Subsequent runs use learned mappings (faster)
- Use `show-state` to see how many mappings are learned

## Data Privacy & Security

✅ **What's private:**
- CSV files stay on your computer
- Categories are stored locally (~/.privacy-budget/state/)
- No data sent to external servers except Claude API

⚠️ **What goes to Claude:**
- Merchant names and descriptions (for classification)
- Transaction amounts and dates (for understanding context)
- These are processed in real-time and not stored

📋 **What you control:**
- Which statements to analyze
- When to correct categorizations
- When to clear learned state

## Advanced Usage

### Custom Constraints
```json
{
  "monthly_income": 6500,
  "savings_goal": 1500,
  "priority_goals": ["travel", "education"]
}
```

### Batch Processing
```bash
#!/bin/bash
for month in jan feb mar apr may jun; do
  python3 privacy_budget.py parse statements/${month}.csv
  python3 privacy_budget.py categorize ${month}_parsed.json personal
  python3 privacy_budget.py analyze ${month}_categorized.json personal
  python3 privacy_budget.py plan ${month}_analysis.json personal
done
# Creates plan for each month
```

### Multiple Accounts
```bash
# Personal checking
python3 privacy_budget.py categorize checking_parsed.json personal
# Personal savings
python3 privacy_budget.py categorize savings_parsed.json personal
# Business account
python3 privacy_budget.py categorize business_parsed.json business
# Each learns separately!
```

## Roadmap

**Future features (post-MVP):**
- PDF statement parsing
- Multi-month trend analysis
- PDF export with charts and graphs
- Cloud dashboard for visualization
- Shared budgets (family/team)
- Real-time spending alerts
- Budget vs. actual tracking
- Tax categorization helpers

## Support

For issues or questions:
1. Check the [Design Doc](Design%20Doc.md) for architecture
2. Review [BUILD_STATUS.md](BUILD_STATUS.md) for known issues
3. Check example files in `Example Files/` directory

## Contributing

This is an MVP. Areas for contribution:
- Better merchant name extraction
- Additional CSV format support
- PDF parsing
- Category optimization rules
- Visualization and reporting

## License

MIT - Use freely, modify, share.

## Credits

Built with Claude 3.5 Sonnet for intelligent transaction classification.

---

**Last Updated:** 2026-05-03
**Status:** MVP (Beta)
**Version:** 0.1.0

# Privacy Budget MVP - All Options & Workflows

**Complete guide to using Privacy Budget in every possible way.**

---

## 🎯 Quick Reference

| What | Command | Best For |
|------|---------|----------|
| **Everything in one go** | `full-pipeline` | Non-technical users |
| **Just parse CSV** | `parse` | Reviewing raw data |
| **Just categorize** | `categorize` | Training the system |
| **Just analyze** | `analyze` | Spending insights only |
| **Just plan** | `plan` | Budget recommendations only |
| **Just dashboard** | `dashboard` | Visualize existing results |
| **Check learning** | `show-state` | See what system learned |
| **Clear learning** | `reset-state` | Start fresh |

---

# OPTION C: ONE-COMMAND PIPELINE (Full Automation)

**For:** Anyone who wants to upload CSV and get dashboard (no steps)

## Basic Usage

```bash
python3 privacy_budget.py full-pipeline april_statement.csv personal
```

**What it does:**
1. Parse CSV
2. Auto-categorize transactions
3. Analyze spending
4. Create budget plan
5. Generate HTML dashboard

**Output:**
- JSON files (for technical users)
- HTML dashboard (for everyone)

## With Constraints

```bash
python3 privacy_budget.py full-pipeline april_statement.csv personal --constraints constraints.json
```

**constraints.json:**
```json
{
  "monthly_income": 5000,
  "savings_goal": 800,
  "priority_goals": ["reduce_dining", "travel"]
}
```

## Examples

### Personal Budget
```bash
python3 privacy_budget.py full-pipeline personal_checking.csv personal
```

### Business Expenses
```bash
python3 privacy_budget.py full-pipeline business_expenses.csv business
```

### With Goals
```bash
python3 privacy_budget.py full-pipeline april.csv personal --constraints goals.json
```

## Output Files Generated
- `april_parsed.json` - Extracted transactions
- `april_categorized.json` - With categories
- `april_analysis.json` - Insights and anomalies
- `april_plan.json` - Budget recommendations
- `may_03_2026_personal_dashboard.html` - **Beautiful dashboard** ← Open this!

---

# OPTION A: INDIVIDUAL COMMANDS (Flexible Workflow)

**For:** Power users, developers, or when you want control over each step

## Step-by-Step Breakdown

### Step 1: Parse CSV Statement

```bash
python3 privacy_budget.py parse april_statement.csv
```

**Output:** `april_statement_parsed.json`

```json
[
  {
    "date": "2024-03-31",
    "merchant": "Interest Deposit",
    "amount": 1.2,
    "description": "Interest Deposit",
    "source": "amex_csv"
  },
  ...
]
```

**Use this when:** You want to verify parsing before proceeding

---

### Step 2: Categorize Transactions

```bash
python3 privacy_budget.py categorize april_statement_parsed.json personal
```

**Output:** `april_statement_parsed_categorized.json`

```json
[
  {
    "date": "2024-03-31",
    "merchant": "Interest Deposit",
    "amount": 1.2,
    "description": "Interest Deposit",
    "source": "amex_csv",
    "original_category": "Food & Dining",
    "user_category": "Food & Dining",
    "type": "personal",
    "category_confidence": 0.5
  },
  ...
]
```

**Use this when:** You want to review/correct categorizations

#### With Corrections

If you want to correct categories:

```bash
# corrections.json
{
  "Slack": "Software Expenses",
  "Starbucks": "Business Meals",
  "AWS": "Cloud Services"
}

python3 privacy_budget.py categorize april_statement_parsed.json personal --corrections corrections.json
```

**System will:**
- Apply your corrections
- Detect conflicts (same merchant, different categories)
- Ask you to resolve
- Learn from corrections

---

### Step 3: Analyze Spending

```bash
python3 privacy_budget.py analyze april_statement_parsed_categorized.json personal
```

**Output:** `april_statement_parsed_categorized_analysis.json`

Contains:
- Summary (total, count, average)
- Spending by category (with trends)
- Top merchants
- Anomalies detected
- Key insights

**Use this when:** You only need insights, not recommendations

---

### Step 4: Create Budget Plan

```bash
python3 privacy_budget.py plan april_statement_parsed_categorized_analysis.json personal
```

**Output:** `april_03_2026_personal_budget.json`

Contains:
- Current spending breakdown
- Budget recommendations per category
- Savings potential ($1,250.76)
- Monthly/quarterly/annual projections
- Actionable next steps

**Use this when:** You want budget recommendations

#### With Constraints

```bash
python3 privacy_budget.py plan april_analysis.json personal --constraints constraints.json
```

Where `constraints.json`:
```json
{
  "monthly_income": 6000,
  "savings_goal": 1500,
  "priority_goals": ["education", "travel"]
}
```

---

### Step 5: Generate Dashboard

```bash
python3 privacy_budget.py dashboard april_analysis.json april_plan.json personal
```

**Output:** `may_03_2026_personal_dashboard.html`

Beautiful interactive dashboard with:
- Charts and visualizations
- Color-coded tables
- Budget comparisons
- Print and download buttons

**Use this when:** You want to visualize the results

---

## Chaining Individual Commands

Run them sequentially:

```bash
# Parse
python3 privacy_budget.py parse april_statement.csv

# Categorize
python3 privacy_budget.py categorize april_statement_parsed.json personal

# Analyze
python3 privacy_budget.py analyze april_statement_parsed_categorized.json personal

# Plan
python3 privacy_budget.py plan april_statement_parsed_categorized_analysis.json personal

# Dashboard
python3 privacy_budget.py dashboard april_statement_parsed_categorized_analysis.json april_statement_personal_budget.json personal

# View
open april_03_2026_personal_dashboard.html
```

---

# MANAGEMENT COMMANDS

## View Learned Classifications

See what the system has learned across sessions:

```bash
python3 privacy_budget.py show-state personal
```

**Output:**
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

**Also available for business:**
```bash
python3 privacy_budget.py show-state business
```

---

## Reset Learning (Start Fresh)

Clear all learned mappings and conflicts:

```bash
python3 privacy_budget.py reset-state personal
```

**Confirmation:**
```
✓ Reset personal classifier state
```

**Use when:**
- You made wrong corrections and want to retrain
- Starting fresh month
- Testing the system

---

# ACCOUNT TYPES

Every command supports two account types:

## Personal

```bash
python3 privacy_budget.py full-pipeline statement.csv personal
```

**Categories:** Food & Dining, Transportation, Entertainment, Healthcare, Education, Travel, etc.

---

## Business

```bash
python3 privacy_budget.py full-pipeline expenses.csv business
```

**Categories:** Payroll, Software Expenses, Cloud Services, Professional Services, Marketing, Office Supplies, Travel, Business Meals, etc.

---

# WORKFLOW EXAMPLES

## Workflow 1: Complete Monthly Review (Option C)

**For:** People who want full analysis in one shot

```bash
# Download April statement from bank
# Run one command
python3 privacy_budget.py full-pipeline april_statement.csv personal

# Open dashboard
open april_03_2026_personal_dashboard.html

# Review spending and recommendations
# Done!
```

---

## Workflow 2: Detailed Analysis (Option A)

**For:** People who want to review each step

```bash
# 1. Parse and verify
python3 privacy_budget.py parse april_statement.csv
# Review: april_statement_parsed.json

# 2. Categorize and correct
python3 privacy_budget.py categorize april_statement_parsed.json personal
# System asks about conflicts
# You confirm corrections

# 3. Get insights
python3 privacy_budget.py analyze april_statement_parsed_categorized.json personal
# Review: april_statement_parsed_categorized_analysis.json

# 4. Create plan
python3 privacy_budget.py plan april_statement_parsed_categorized_analysis.json personal
# Review: april_statement_personal_budget.json

# 5. Visualize
python3 privacy_budget.py dashboard april_statement_parsed_categorized_analysis.json april_statement_personal_budget.json personal
open april_03_2026_personal_dashboard.html
```

---

## Workflow 3: Training the System (Option A)

**For:** You want the system to learn your preferences

```bash
# Month 1: Parse and categorize with corrections
python3 privacy_budget.py parse may_statement.csv
python3 privacy_budget.py categorize may_parsed.json personal --corrections corrections.json
# System learns: Slack → Software, Starbucks → Business Meals, etc.

# Check what it learned
python3 privacy_budget.py show-state personal
# Shows: 15 learned mappings

# Month 2: Much faster (no corrections needed)
python3 privacy_budget.py full-pipeline june_statement.csv personal
# System auto-classifies correctly based on learning
# Done in seconds!
```

---

## Workflow 4: Business Owner (Option C)

**For:** Small business managing expenses

```bash
python3 privacy_budget.py full-pipeline business_q1_expenses.csv business

# View recommendations for:
# - Software expenses consolidation
# - Payroll optimization
# - Travel costs
# - Professional services negotiation

open q1_2026_business_dashboard.html
```

---

## Workflow 5: Mixed Personal + Business (Option A)

**For:** You have both personal and business accounts

```bash
# Personal
python3 privacy_budget.py full-pipeline personal_checking.csv personal
open april_03_2026_personal_dashboard.html

# Business
python3 privacy_budget.py full-pipeline business_amex.csv business
open april_03_2026_business_dashboard.html

# Compare separately - no mixing of data
```

---

## Workflow 6: Batch Processing (Option A)

**For:** Processing multiple months at once

```bash
for month in january february march april; do
  echo "Processing $month..."
  python3 privacy_budget.py full-pipeline "${month}_statement.csv" personal
done

# Creates:
# - january_03_2026_personal_dashboard.html
# - february_03_2026_personal_dashboard.html
# - march_03_2026_personal_dashboard.html
# - april_03_2026_personal_dashboard.html
```

---

## Workflow 7: Custom Goals (Option C)

**For:** You have specific financial goals

```bash
# constraints.json
{
  "monthly_income": 8000,
  "savings_goal": 2000,
  "priority_goals": ["emergency_fund", "education", "travel"]
}

python3 privacy_budget.py full-pipeline april_statement.csv personal --constraints constraints.json

# Budget recommendations adjusted for your goals
open april_03_2026_personal_dashboard.html
```

---

# HTML DASHBOARD OPTIONS

## Viewing the Dashboard

```bash
# Auto-opens in browser
open may_03_2026_personal_dashboard.html

# Or manually open
# Double-click the file in Finder/Explorer
```

## Dashboard Features

✅ **Interactive Charts**
- Click pie slices for details
- Hover for values
- Responsive design

✅ **Sorting & Filtering**
- Sort by amount
- Sort by merchant
- Toggle anomalies

✅ **Print Friendly**
```bash
# Click "Print" button in dashboard
# Or:
cmd+P (Mac) or ctrl+P (Windows)
```

✅ **Download/Share**
```bash
# Click "Download" button to save
# Email the file
# Upload to cloud storage
```

---

# FILE ORGANIZATION

## After Running Commands

```
Your Project/
├── april_statement.csv                    ← Your input
├── april_statement_parsed.json            ← Step 1 output
├── april_statement_parsed_categorized.json ← Step 2 output
├── april_statement_parsed_categorized_analysis.json ← Step 3 output
├── april_statement_personal_budget.json   ← Step 4 output
├── april_03_2026_personal_dashboard.html  ← Step 5 output ⭐
├── corrections.json                       ← Your corrections (optional)
└── constraints.json                       ← Your goals (optional)
```

## Cleanup Tips

```bash
# Keep only the dashboard and original CSV
rm *_parsed.json *_categorized.json *_analysis.json *_plan.json

# Or organize by month
mkdir april_2026
mv april_* april_2026/
```

---

# TROUBLESHOOTING

## "No module named anthropic"

**Solution:**
```bash
pip install anthropic
# or with user flag
pip install --user anthropic
```

## "ANTHROPIC_API_KEY not set"

**Solution:**
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
# Verify:
echo $ANTHROPIC_API_KEY
```

## "File not found"

**Solution:**
- Use full path: `/Users/you/path/to/file.csv`
- Use relative path: `./april_statement.csv` (from same folder)
- Check file spelling

## "CSV format not detected"

**Solution:**
- Make sure CSV is from Wells Fargo or American Express
- Try exporting again from your bank
- Check that file has actual transaction rows (not just headers)

---

# QUICK COMMAND REFERENCE

```bash
# ONE COMMAND (Recommended for most users)
python3 privacy_budget.py full-pipeline STATEMENT.csv ACCOUNT_TYPE

# INDIVIDUAL COMMANDS
python3 privacy_budget.py parse STATEMENT.csv
python3 privacy_budget.py categorize PARSED.json ACCOUNT_TYPE
python3 privacy_budget.py analyze CATEGORIZED.json ACCOUNT_TYPE
python3 privacy_budget.py plan ANALYSIS.json ACCOUNT_TYPE
python3 privacy_budget.py dashboard ANALYSIS.json PLAN.json ACCOUNT_TYPE

# MANAGEMENT
python3 privacy_budget.py show-state ACCOUNT_TYPE
python3 privacy_budget.py reset-state ACCOUNT_TYPE

# ACCOUNT TYPES
# personal (default)
# business

# WITH CONSTRAINTS
python3 privacy_budget.py full-pipeline STATEMENT.csv ACCOUNT_TYPE --constraints CONSTRAINTS.json
python3 privacy_budget.py plan ANALYSIS.json ACCOUNT_TYPE --constraints CONSTRAINTS.json

# WITH CORRECTIONS
python3 privacy_budget.py categorize PARSED.json ACCOUNT_TYPE --corrections CORRECTIONS.json
```

---

# KEY DIFFERENCES

## Option C (Full Pipeline) vs Option A (Individual Commands)

| Aspect | Option C | Option A |
|--------|----------|----------|
| **Ease** | One command | Multiple commands |
| **Control** | Automatic | Manual at each step |
| **Review** | Results only | Review each step |
| **Corrections** | Limited | Full control |
| **Speed** | Fast overall | Flexible |
| **Best for** | Non-technical users | Developers/power users |
| **Learning** | Automatic | Manual training possible |
| **Error handling** | Graceful | Step-by-step debugging |

---

# RECOMMENDATIONS

**Start with Option C if:**
- You're not technical
- You want results quickly
- You don't need to review each step

**Use Option A if:**
- You want to review each step
- You need to correct categories manually
- You're training the system
- You want maximum control

**Use both by:**
- Running Option C normally
- Running Option A for detailed analysis on important months

---

**Status:** Complete guide for all usage patterns
**Last Updated:** May 3, 2026

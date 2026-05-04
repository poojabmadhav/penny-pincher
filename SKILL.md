---
name: privacy-budget
description: Privacy-first financial budgeting assistant. Analyze spending and create budget plans without bank connections.
---

# Privacy Budget

A privacy-focused budgeting assistant that helps you analyze spending patterns and create budget plans without requiring bank account connections.

## Installation

1. Clone this repository into your Claude Code skills directory:
```bash
mkdir -p ~/.claude/skills/
cp -r privacy-budget ~/.claude/skills/
```

2. Install Python dependencies:
```bash
pip install anthropic
```

3. Set up your Claude API key:
```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

## Usage

Privacy Budget provides 4 independent agents that work together:

### 1. Parse a Bank Statement

Extract transactions from CSV files (Wells Fargo, American Express):

```
/parse-statement <file_path>

Example:
/parse-statement ./april_statement.csv
```

**Outputs:** Structured transaction list with dates, merchants, amounts

---

### 2. Categorize Transactions

Auto-classify transactions and learn from corrections:

```
/categorize <type> <transactions_json>

Example:
/categorize personal april_transactions.json
```

**Modes:**
- `personal` - Personal spending categories
- `business` - Business expense categories

**Features:**
- Auto-classifies using Claude
- Learns from your corrections
- Detects conflicting categorizations
- Persists learned mappings locally

**Outputs:** Categorized transactions with confidence scores, detected conflicts

---

### 3. Analyze Spending

Generate insights from categorized transactions:

```
/analyze <transactions_json> [type]

Example:
/analyze april_categorized.json personal
```

**Outputs:**
- Spending by category
- Trends and anomalies
- Top merchants
- Key insights

---

### 4. Create Budget Plan

Get budget recommendations based on analysis:

```
/plan <analysis_json> [type] [constraints_json]

Example:
/plan april_analysis.json personal constraints.json
```

**Constraint Example (constraints.json):**
```json
{
  "monthly_income": 5000,
  "savings_goal": 800,
  "priority_goals": ["reduce_dining", "increase_savings"]
}
```

**Outputs:**
- Current spending breakdown
- Budget recommendations per category
- Total savings potential
- Projected future budget
- Actionable next steps

---

## Full Workflow

**One-Step Pipeline:**

```
1. Upload: april_statement.csv (bank export)
2. Parse:  Extract transactions
3. Review: Correct any miscategorized items
4. Analyze: Get spending insights
5. Plan: Create budget recommendations
6. Save: Plan saved with timestamp (april_1_2026_personal_budget.json)
```

---

## Data Privacy

- ✅ All data stays on your computer
- ✅ No bank account connections required
- ✅ CSV uploads only (no API access)
- ✅ Learned categories stored locally
- ✅ Works completely offline after setup

---

## Supported CSV Formats

### Wells Fargo
```
"12/27/2024","-150.00","*","","AMERICANEXPRESS TRANSFER..."
"12/24/2024","-100.00","*","","VENMO PAYMENT..."
```

### American Express
```
Date,Description,Status,Currency,Amount,Ending Balance,Reference
3/31/2024,Interest Deposit,Posted,USD,1.20,1104.64,9001534486578
```

---

## Managing Learned Categories

Your categorizer learns from corrections and saves them locally:

```bash
# View learned mappings
/show-state personal

# Clear state and start fresh
/reset-state personal
```

---

## Common Workflows

### Personal Budget Optimization

```
1. /parse-statement june_checking.csv
2. /categorize personal june_transactions.json
   → Review and correct categorizations
3. /analyze june_categorized.json personal
4. /plan june_analysis.json personal
   → Review recommendations
```

### Business Expense Analysis

```
1. /parse-statement q2_expenses.csv
2. /categorize business q2_transactions.json
   → Correct merchant classifications
3. /analyze q2_categorized.json business
   → Review spending patterns
4. /plan q2_analysis.json business constraints.json
   → Get optimization recommendations
```

### Track Against Previous Budget

```
1. Generate plan from current month
2. Compare category spending vs. recommended budget
3. Adjust next month's plan based on actual vs. budgeted
```

---

## Troubleshooting

**"Could not detect CSV format"**
- Ensure file is in Wells Fargo or American Express format
- Check that CSV has proper headers and quotes

**"No transactions found"**
- Verify CSV has actual transaction rows (not just headers)
- Check date format is MM/DD/YYYY

**"Claude API error"**
- Verify ANTHROPIC_API_KEY is set
- Check that your API key is valid

**"File not found"**
- Use absolute path or check working directory
- Example: `/Users/pooja/Documents/statements/april.csv`

---

## Tips

1. **Start simple:** Begin with one month of data
2. **Correct early:** Categorizer learns faster with corrections
3. **Review regularly:** Monthly review helps catch spending patterns
4. **Compare over time:** Compare current month to previous month's recommendations
5. **Adjust constraints:** Update income and savings goals as they change

---

## Next Features (Roadmap)

- [ ] PDF statement parsing
- [ ] Multi-month trend analysis
- [ ] PDF export with charts
- [ ] Cloud dashboard for visualization
- [ ] Shared budgets (family/team)
- [ ] Real-time alerts for unusual spending

---

**Status:** MVP (Beta)
**Last Updated:** 2026-05-03
**Support:** Issues and feedback at project repository

# Privacy Budget MVP - Design Document

**Status:** Design Phase
**Created:** 2026-05-03
**Owner:** Pooja
**Distribution:** Claude Code Skill (GitHub)

---

## 1. Project Overview

A privacy-focused personal and business budgeting assistant that helps users analyze spending patterns and create budget plans without requiring bank account connections.

**Core Value:** Users upload bank statements or transaction data → system categorizes → provides insights → recommends budget plans. All data stays on their computer.

**Deployment:** Claude Code Skill (runs locally, distributed via GitHub)
**Audience:** Personal users + small-medium business owners
**Privacy Model:** Zero-trust, all processing local, no data sent to external services

---

## 2. Architecture

### 2.1 System Design

```
User Input
    ↓
[Parser Agent] → Structured Transactions
    ↓
[Categorizer Agent] → Categorized Transactions (with learning)
    ↓
[Analyzer Agent] → Spending Insights
    ↓
[Planner Agent] → Budget Recommendations
```

**Key principle:** Each agent is independently callable AND part of a pipeline.

### 2.2 Deployment Model

- **Platform:** Claude Code Skill
- **Distribution:** GitHub repository
- **Installation:** User clones repo → copies to `~/.claude/skills/privacy-budget/`
- **Invocation:** `/privacy-budget` in Claude Code
- **State storage:** Local JSON files in user's vault
- **Data privacy:** All processing happens locally, no cloud calls (except Claude API if needed)

### 2.3 Skill Structure

```
privacy-budget/
├── SKILL.md                      # Main skill definition
├── agents/
│   ├── parser.py
│   ├── categorizer.py
│   ├── analyzer.py
│   └── planner.py
├── utils/
│   ├── state_manager.py          # Classifier state persistence
│   ├── conflict_detector.py      # Detect inconsistencies
│   └── data_models.py            # Transaction, Category definitions
├── templates/
│   ├── personal_categories.json
│   └── business_categories.json
└── README.md
```

---

## 3. Data Model

### 3.1 Transaction

```python
{
  "date": "2026-05-01",
  "merchant": "Slack",
  "amount": 19.99,
  "description": "Slack subscription monthly",
  "original_category": "Software Expenses",  # Auto-classified
  "user_category": "Software Expenses",      # User-corrected or created
  "type": "business" | "personal",
  "source": "statement_id"
}
```

### 3.2 Category

```python
{
  "name": "Software Expenses",
  "type": "business" | "personal",
  "is_custom": false,  # True if user created it
  "learned_merchants": ["Slack", "GitHub", "Figma"],  # Classifier learned these
  "confidence": 0.95,
  "last_used": "2026-05-01"
}
```

### 3.3 Classifier State

```json
{
  "version": "1.0",
  "last_updated": "2026-05-03",
  "personal": {
    "Starbucks": {
      "category": "Food & Dining",
      "count": 3,
      "confidence": 0.95
    },
    "Uber": {
      "category": "Transportation",
      "count": 5,
      "confidence": 0.98
    }
  },
  "business": {
    "Slack": {
      "category": "Software Expenses",
      "count": 2,
      "confidence": 0.99
    },
    "AWS": {
      "category": "Cloud Services",
      "count": 1,
      "confidence": 0.90
    }
  },
  "conflicts": [
    {
      "merchant": "Starbucks",
      "categories": ["Food & Dining", "Business Meals"],
      "counts": [2, 1],
      "flagged_date": "2026-05-02",
      "resolved": false
    }
  ]
}
```

---

## 4. Agent Specifications

### 4.1 Parser Agent

**Purpose:** Extract transactions from bank statements/documents

**Input:**
- File (PDF, CSV, TXT, or raw text)
- Format hint (optional): "chase_csv", "generic_pdf", etc.

**Output:**
```python
{
  "status": "success",
  "transaction_count": 45,
  "transactions": [
    {
      "date": "2026-05-01",
      "merchant": "Slack",
      "amount": 19.99,
      "description": "Slack subscription monthly"
    },
    ...
  ],
  "parsing_notes": ["12 transactions with ambiguous dates", "2 entries merged"]
}
```

**Capabilities:**
- Parse CSV files (auto-detect columns)
- Extract from bank PDF statements
- Handle raw text input
- Flag malformed entries
- Normalize dates and amounts

**Usage:**
```
/parse-statement --file statement.csv
```

---

### 4.2 Categorizer Agent

**Purpose:** Classify transactions into user categories, learn from corrections, detect conflicts

**Input:**
```python
{
  "transactions": [...],
  "type": "personal" | "business",
  "classifier_state": {...},  # Learned mappings
  "user_corrections": [
    {"merchant": "Slack", "category": "Software Expenses"},
    {"merchant": "Starbucks", "category": "Business Meals"}  # New custom category
  ]
}
```

**Output:**
```python
{
  "status": "success",
  "categorized_transactions": [...],
  "new_learnings": {
    "Slack": "Software Expenses",
    "AWS": "Cloud Services"
  },
  "conflicts": [
    {
      "merchant": "Starbucks",
      "previous_category": "Food & Dining",
      "new_category": "Business Meals",
      "resolution": "needs_user_decision"
    }
  ],
  "confidence_low": [
    {"merchant": "XYZ Corp", "suggested": "Professional Services", "confidence": 0.65}
  ]
}
```

**Workflow:**
1. Load classifier state (learned mappings)
2. Auto-classify all transactions using learned mappings + Claude's understanding
3. Apply user corrections
4. Detect conflicts: If a merchant has multiple categories across statements, flag it
5. For conflicts: Ask user which one is correct → majority vote
6. Learn from all corrections
7. Update classifier state with new learnings

**Conflict Resolution Logic:**
- If "Slack" classified as "Software" 3 times, "Office Supplies" 1 time → Suggest "Software" (majority vote)
- But always ask user to confirm
- Apply decision retroactively to all past transactions with that merchant

**Usage:**
```
/categorize --type business --file transactions.json
# User corrects some categories
# Classifier updates, detects conflicts, asks for resolution
```

---

### 4.3 Analyzer Agent

**Purpose:** Generate insights from categorized transactions

**Input:**
```python
{
  "categorized_transactions": [...],
  "type": "personal" | "business",
  "time_period": "monthly" | "quarterly" | "annual"
}
```

**Output:**
```python
{
  "status": "success",
  "summary": {
    "total_spent": 5432.10,
    "transaction_count": 47,
    "date_range": "2026-04-01 to 2026-05-01",
    "type": "personal"
  },
  "by_category": {
    "Food & Dining": {
      "total": 450.50,
      "count": 32,
      "percentage": 8.3,
      "trend": "up"  # vs previous period
    },
    "Transportation": {
      "total": 280.00,
      "count": 15,
      "percentage": 5.2,
      "trend": "stable"
    },
    ...
  },
  "insights": [
    "Food spending increased 20% compared to last month",
    "Recurring software subscriptions total $150/month",
    "Top merchant: Starbucks ($120/month avg)"
  ],
  "anomalies": [
    "Unusually high Amazon purchase ($580) on 2026-04-28"
  ]
}
```

**Capabilities:**
- Spending by category (with trends)
- Recurring vs one-time expenses
- Top merchants
- Anomaly detection
- Period-over-period comparisons
- Category growth/decline

**Usage:**
```
/analyze --type personal --period monthly
```

---

### 4.4 Planner Agent

**Purpose:** Create budget recommendations based on analysis

**Input:**
```python
{
  "analysis": {...},  # From Analyzer
  "type": "personal" | "business",
  "constraints": {
    "monthly_income": 5000,  # Optional
    "savings_goal": 1000,    # Optional
    "priority_goals": ["reduce_dining", "increase_savings"]  # Optional
  }
}
```

**Output:**
```python
{
  "status": "success",
  "current_state": {
    "total_spent": 5432.10,
    "by_category": {...}
  },
  "budget_recommendations": {
    "Food & Dining": {
      "current_spend": 450.50,
      "recommended_budget": 350.00,
      "savings_potential": 100.50,
      "reasoning": "20% above historical average, opportunity to optimize"
    },
    "Transportation": {
      "current_spend": 280.00,
      "recommended_budget": 280.00,
      "savings_potential": 0,
      "reasoning": "In line with usage patterns"
    },
    ...
  },
  "total_savings_potential": 450.00,
  "projected_budget": {
    "monthly": 4982.10,
    "annual": 59_785.20
  },
  "next_steps": [
    "Review Food & Dining spending (target: reduce by $100/month)",
    "Consider consolidating software subscriptions",
    "Set up alerts for recurring charges"
  ]
}
```

**Capabilities:**
- Spend vs budget gaps
- Savings optimization suggestions
- Recurring expense consolidation opportunities
- Anomaly reduction strategies
- Period projections (next month, quarter, year)

**Usage:**
```
/plan --type personal --income 5000 --goal "reduce_spending_by_500"
```

---

## 5. Workflows

### 5.1 Full Pipeline (Personal)

```
1. User: "Analyze my April spending"
2. User uploads: april_statement.csv
3. Parser: Extracts 45 transactions
4. Categorizer: Auto-classifies all (personal mode)
   - Loads learned state: "Starbucks → Food & Dining", etc.
   - Suggests all categories
5. User reviews + corrects (optional)
   - Changes "Uber" from "Entertainment" to "Transportation"
   - Creates new category "Business Meals" for some
6. Categorizer: Applies corrections, detects conflicts
   - Finds "Starbucks" was "Food & Dining" before, now "Business Meals" → FLAG
7. System asks: "Starbucks has been both. Which is correct?"
8. User: "Business Meals (I use it for client meetings)"
9. Categorizer: Applies decision retroactively, updates state
10. Analyzer: Generates insights (spending by category, trends, anomalies)
11. Planner: Creates budget recommendations
12. User sees: Full analysis + recommendations
```

### 5.2 Business Mode

Same as above, but:
- Classifier starts with business categories (Payroll, Software, Legal, etc.)
- Different category schema
- Business-focused insights (cash flow, expense optimization)

### 5.3 Mixed Mode (Same User, Both Personal + Business)

```
1. User has: personal_april.csv + business_april.csv
2. Run separately:
   - /categorize --type personal --file personal_april.csv
   - /categorize --type business --file business_april.csv
3. Results kept separate (no intermingling)
4. User can manually move transactions:
   - "Move this Uber ride to business" → System updates categorization
```

### 5.4 Individual Agent Calls

User can call agents independently:

```
# Just parse a statement
/parse-statement --file july_statement.csv

# Categorize existing transactions (from previous parse)
/categorize --type business --file transactions.json

# Get insights without planning
/analyze --type personal --period monthly

# Get budget plan from existing analysis
/plan --type personal --income 6000
```

---

## 6. Classifier Learning & Conflict Detection

### 6.1 Learning Workflow

1. **First statement:** User corrects some categories
   - Classifier learns: "Slack → Software Expenses" (merchant → category)
   - Confidence: Based on frequency

2. **Second statement:** Same merchant appears
   - Classifier applies learned mapping automatically
   - User can confirm or override

3. **Consistent learning:** Classifier tracks confidence
   - 1 correction: 70% confidence
   - 3 corrections same way: 95% confidence
   - Suggested categories ranked by confidence

### 6.2 Conflict Detection

**Trigger:** Same merchant categorized differently across statements

**Example:**
- Statement A: "Starbucks → Food & Dining" (user corrected)
- Statement B: "Starbucks → Business Meals" (user corrected differently)
- System: "Starbucks conflict detected. You've classified it as both. Which one?"

**Resolution:**
- Majority vote as default suggestion
  - "You've classified Starbucks as Food & Dining 2x, Business Meals 1x. Use Food & Dining?" ✓
- User chooses definitive category
- Apply retroactively to all past transactions with that merchant
- Update classifier state with unanimous decision

### 6.3 State Persistence

Classifier state stored as JSON in user's vault:
```
~/.claude/skills/privacy-budget/classifier_state.json
```

Loaded on every categorization, updated after each session.

---

## 7. MVP Scope

### In Scope ✅
- Parser: CSV + basic text extraction
- Categorizer: Auto-classify with learning + conflict detection
- Analyzer: Basic spending breakdown by category + trends
- Planner: Budget recommendations
- Classifier state management (JSON)
- Personal + Business separation
- Majority vote conflict resolution
- Manual category creation by user

### Out of Scope (Future)
- PDF parsing (use OCR/ML)
- Real-time bank sync
- Mobile app
- Advanced ML predictions
- Multi-currency support
- Tax categorization
- Receipt OCR
- API integrations
- Cloud sync

---

## 8. Getting Started

### Tech Stack
- Language: Python 3.9+
- Claude: Claude API for agent intelligence
- File handling: CSV, JSON
- State management: Local JSON files

### Build Order
1. Set up SKILL.md and directory structure
2. Build data models (`data_models.py`)
3. Build state manager (`state_manager.py`)
4. Build Parser Agent
5. Build Categorizer Agent (hardest part)
6. Build Analyzer Agent
7. Build Planner Agent
8. Integrate agents into SKILL.md
9. Test workflows
10. Write documentation

### Testing Strategy
- Unit tests for each agent (sample data)
- Integration tests (full pipeline)
- Manual testing with real statements
- Classifier learning validation

---

## 9. Success Criteria

**MVP is complete when:**
- ✅ Users can upload a statement
- ✅ Parser extracts transactions correctly
- ✅ Categorizer auto-classifies and learns from corrections
- ✅ Analyzer generates accurate insights
- ✅ Planner creates actionable recommendations
- ✅ Classifier state persists between uses
- ✅ Conflict detection works (flags merchant inconsistencies)
- ✅ Both personal and business modes work separately
- ✅ All agents callable independently
- ✅ Privacy model intact (data stays local)

---

## 10. Next Steps

1. Approve this design
2. Set up GitHub repository structure
3. Start building Parser Agent (simplest)
4. Document learnings in wiki as we go
5. Create multi-agent patterns documentation

---

**Status:** Ready for implementation review
**Last Updated:** 2026-05-03

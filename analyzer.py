"""
Analyzer Agent for Privacy Budget MVP

Generates spending insights from categorized transactions.
"""

import json
from typing import List, Dict, Optional
from collections import defaultdict
from datetime import datetime
from data_models import Transaction


class AnalyzerAgent:
    """Analyzes categorized transactions and generates insights."""

    def analyze(
        self,
        transactions: List[Dict],
        account_type: str = "personal",
        time_period: str = "monthly"
    ) -> Dict:
        """
        Analyze spending from categorized transactions.

        Args:
            transactions: List of categorized transaction dicts
            account_type: "personal" or "business"
            time_period: "monthly", "quarterly", "annual"

        Returns:
            {
                "status": "success",
                "summary": {...},
                "by_category": {...},
                "insights": [...],
                "anomalies": [...],
                "top_merchants": [...]
            }
        """
        try:
            if not transactions:
                return self._error_response("No transactions provided")

            # Convert to Transaction objects if needed
            txn_objects = [
                Transaction(**t) if isinstance(t, dict) else t
                for t in transactions
            ]

            # Calculate totals
            total_spent = sum(t.amount for t in txn_objects)
            total_count = len(txn_objects)

            # Get date range
            dates = sorted([datetime.fromisoformat(t.date) for t in txn_objects])
            date_range = f"{dates[0].strftime('%Y-%m-%d')} to {dates[-1].strftime('%Y-%m-%d')}" if dates else "N/A"

            # Analyze by category
            by_category = self._analyze_by_category(txn_objects)

            # Find anomalies (transactions > 1.5x average)
            anomalies = self._find_anomalies(txn_objects)

            # Find top merchants
            top_merchants = self._find_top_merchants(txn_objects, limit=5)

            # Generate insights
            insights = self._generate_insights(txn_objects, by_category)

            return {
                "status": "success",
                "account_type": account_type,
                "summary": {
                    "total_spent": round(total_spent, 2),
                    "transaction_count": total_count,
                    "date_range": date_range,
                    "account_type": account_type,
                    "average_transaction": round(total_spent / total_count, 2) if total_count > 0 else 0
                },
                "by_category": by_category,
                "insights": insights,
                "anomalies": anomalies,
                "top_merchants": top_merchants
            }

        except Exception as e:
            return self._error_response(f"Analysis error: {str(e)}")

    def _analyze_by_category(self, transactions: List[Transaction]) -> Dict:
        """Analyze spending by category."""
        categories = defaultdict(lambda: {"total": 0, "count": 0, "transactions": []})

        for txn in transactions:
            category = txn.user_category or txn.original_category or "Uncategorized"
            categories[category]["total"] += txn.amount
            categories[category]["count"] += 1
            categories[category]["transactions"].append({
                "date": txn.date,
                "merchant": txn.merchant,
                "amount": txn.amount
            })

        # Calculate percentages and prepare output
        total_spent = sum(cat["total"] for cat in categories.values())
        result = {}

        for category, data in sorted(categories.items(), key=lambda x: abs(x[1]["total"]), reverse=True):
            result[category] = {
                "total": round(data["total"], 2),
                "count": data["count"],
                "percentage": round((abs(data["total"]) / total_spent * 100), 1) if total_spent > 0 else 0,
                "average_transaction": round(data["total"] / data["count"], 2) if data["count"] > 0 else 0,
                "trend": self._calculate_trend(data["transactions"]),
                "top_merchants": self._get_category_top_merchants(data["transactions"], limit=3)
            }

        return result

    def _find_anomalies(self, transactions: List[Transaction], threshold: float = 1.5) -> List[Dict]:
        """Find unusually large transactions."""
        if not transactions:
            return []

        # Calculate average for positive and negative transactions
        positive = [t.amount for t in transactions if t.amount > 0]
        negative = [t.amount for t in transactions if t.amount < 0]

        anomalies = []

        if positive:
            avg_positive = sum(positive) / len(positive)
            threshold_positive = avg_positive * threshold
            for txn in transactions:
                if txn.amount > threshold_positive:
                    anomalies.append({
                        "date": txn.date,
                        "merchant": txn.merchant,
                        "amount": txn.amount,
                        "category": txn.user_category or txn.original_category,
                        "description": txn.description,
                        "reason": f"Unusually high ({round(txn.amount / avg_positive, 1)}x average)"
                    })

        if negative:
            avg_negative = sum(negative) / len(negative)
            threshold_negative = avg_negative * threshold
            for txn in transactions:
                if txn.amount < threshold_negative:
                    anomalies.append({
                        "date": txn.date,
                        "merchant": txn.merchant,
                        "amount": txn.amount,
                        "category": txn.user_category or txn.original_category,
                        "description": txn.description,
                        "reason": f"Unusually large outflow ({round(abs(txn.amount) / abs(avg_negative), 1)}x average)"
                    })

        return sorted(anomalies, key=lambda x: abs(x["amount"]), reverse=True)[:10]

    def _find_top_merchants(self, transactions: List[Transaction], limit: int = 5) -> List[Dict]:
        """Find merchants with highest spending."""
        merchant_totals = defaultdict(float)

        for txn in transactions:
            merchant_totals[txn.merchant] += txn.amount

        # Sort by absolute value
        sorted_merchants = sorted(merchant_totals.items(), key=lambda x: abs(x[1]), reverse=True)

        return [
            {
                "merchant": merchant,
                "total": round(total, 2),
                "count": sum(1 for t in transactions if t.merchant == merchant)
            }
            for merchant, total in sorted_merchants[:limit]
        ]

    def _get_category_top_merchants(self, transactions: List[Dict], limit: int = 3) -> List[Dict]:
        """Get top merchants within a category."""
        merchant_totals = defaultdict(float)

        for txn in transactions:
            merchant_totals[txn["merchant"]] += txn["amount"]

        sorted_merchants = sorted(merchant_totals.items(), key=lambda x: abs(x[1]), reverse=True)

        return [
            {
                "merchant": merchant,
                "total": round(total, 2)
            }
            for merchant, total in sorted_merchants[:limit]
        ]

    def _calculate_trend(self, transactions: List[Dict]) -> str:
        """Calculate if spending is up, down, or stable."""
        if len(transactions) < 2:
            return "insufficient_data"

        # Sort by date
        sorted_txns = sorted(transactions, key=lambda x: x["date"])

        # Split into halves
        midpoint = len(sorted_txns) // 2
        first_half = sum(abs(t["amount"]) for t in sorted_txns[:midpoint])
        second_half = sum(abs(t["amount"]) for t in sorted_txns[midpoint:])

        if first_half == 0:
            return "stable"

        change = (second_half - first_half) / first_half
        if change > 0.2:
            return "up"
        elif change < -0.2:
            return "down"
        else:
            return "stable"

    def _generate_insights(self, transactions: List[Transaction], by_category: Dict) -> List[str]:
        """Generate human-readable insights."""
        insights = []

        if not transactions:
            return insights

        # Find highest spending category
        if by_category:
            highest_category = max(by_category.items(), key=lambda x: abs(x[1]["total"]))
            insights.append(
                f"Highest spending category: {highest_category[0]} (${abs(highest_category[1]['total']):.2f})"
            )

        # Find recurring merchants (appearing 3+ times)
        from collections import Counter
        merchant_counts = Counter(t.merchant for t in transactions)
        recurring = [m for m, c in merchant_counts.items() if c >= 3]
        if recurring:
            total_recurring = sum(
                t.amount for t in transactions if t.merchant in recurring
            )
            insights.append(
                f"Recurring merchants account for ${abs(total_recurring):.2f} across {len(recurring)} merchants"
            )

        # Identify spending patterns
        total_outflow = sum(t.amount for t in transactions if t.amount < 0)
        total_inflow = sum(t.amount for t in transactions if t.amount > 0)

        if total_inflow > 0:
            insights.append(f"Total inflow: ${total_inflow:.2f}")
        if total_outflow < 0:
            insights.append(f"Total outflow: ${abs(total_outflow):.2f}")

        return insights

    def _error_response(self, error_msg: str) -> Dict:
        """Return standard error response."""
        return {
            "status": "error",
            "error": error_msg,
            "summary": {},
            "by_category": {},
            "insights": [],
            "anomalies": [],
            "top_merchants": []
        }


# CLI interface
if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python analyzer.py <transactions_json_file> [personal|business]")
        sys.exit(1)

    json_file = sys.argv[1]
    account_type = sys.argv[2] if len(sys.argv) > 2 else "personal"

    with open(json_file, 'r') as f:
        transactions = json.load(f)

    analyzer = AnalyzerAgent()
    result = analyzer.analyze(transactions, account_type=account_type)

    print(json.dumps(result, indent=2, default=str))

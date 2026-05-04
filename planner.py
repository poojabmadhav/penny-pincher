"""
Planner Agent for Privacy Budget MVP

Creates budget recommendations based on spending analysis.
"""

import json
from typing import Dict, Optional, List
from datetime import datetime


class PlannerAgent:
    """Creates budget recommendations from analysis."""

    def create_plan(
        self,
        analysis: Dict,
        account_type: str = "personal",
        constraints: Optional[Dict] = None
    ) -> Dict:
        """
        Create budget plan from analysis.

        Args:
            analysis: Output from AnalyzerAgent
            account_type: "personal" or "business"
            constraints: Optional {
                "monthly_income": float,
                "savings_goal": float,
                "priority_goals": [str]
            }

        Returns:
            {
                "status": "success",
                "current_state": {...},
                "budget_recommendations": {...},
                "total_savings_potential": float,
                "projected_budget": {...},
                "next_steps": [...]
            }
        """
        try:
            if analysis.get("status") != "success":
                return self._error_response("Invalid analysis provided")

            constraints = constraints or {}
            monthly_income = constraints.get("monthly_income")
            savings_goal = constraints.get("savings_goal")
            priority_goals = constraints.get("priority_goals", [])

            # Extract current spending by category
            by_category = analysis.get("by_category", {})
            total_current_spending = sum(abs(v["total"]) for v in by_category.values() if v["total"] < 0)

            # Generate budget recommendations
            budget_recommendations = {}
            total_savings_potential = 0

            for category, data in by_category.items():
                current_spend = abs(data["total"])

                # Calculate recommended budget (slightly optimized)
                recommended = self._calculate_recommended_budget(
                    category=category,
                    current_spend=current_spend,
                    trend=data.get("trend", "stable"),
                    account_type=account_type,
                    priority_goals=priority_goals
                )

                savings_potential = current_spend - recommended

                budget_recommendations[category] = {
                    "current_spend": round(current_spend, 2),
                    "recommended_budget": round(recommended, 2),
                    "savings_potential": round(savings_potential, 2),
                    "percentage_change": round(((recommended - current_spend) / current_spend * 100), 1) if current_spend > 0 else 0,
                    "reasoning": self._get_recommendation_reasoning(
                        category=category,
                        current_spend=current_spend,
                        recommended=recommended,
                        trend=data.get("trend"),
                        count=data["count"],
                        account_type=account_type
                    ),
                    "priority": self._calculate_priority(category, account_type)
                }

                if savings_potential > 0:
                    total_savings_potential += savings_potential

            # Project future budget
            projected_monthly = total_current_spending - total_savings_potential
            if monthly_income:
                projected_monthly = min(projected_monthly, monthly_income * 0.85)  # Cap at 85% of income

            projected_budget = {
                "monthly": round(projected_monthly, 2),
                "quarterly": round(projected_monthly * 3, 2),
                "annual": round(projected_monthly * 12, 2)
            }

            # Generate next steps
            next_steps = self._generate_next_steps(
                budget_recommendations=budget_recommendations,
                total_savings_potential=total_savings_potential,
                monthly_income=monthly_income,
                savings_goal=savings_goal,
                priority_goals=priority_goals,
                account_type=account_type
            )

            return {
                "status": "success",
                "account_type": account_type,
                "current_state": {
                    "total_spent": round(total_current_spending, 2),
                    "by_category": {k: {"total": v["total"], "count": v["count"]} for k, v in by_category.items()},
                    "date_range": analysis.get("summary", {}).get("date_range")
                },
                "budget_recommendations": budget_recommendations,
                "total_savings_potential": round(total_savings_potential, 2),
                "projected_budget": projected_budget,
                "next_steps": next_steps,
                "created_at": datetime.now().isoformat()
            }

        except Exception as e:
            return self._error_response(f"Planning error: {str(e)}")

    def _calculate_recommended_budget(
        self,
        category: str,
        current_spend: float,
        trend: str,
        account_type: str,
        priority_goals: List[str]
    ) -> float:
        """Calculate recommended budget for a category."""
        recommended = current_spend

        # Category-specific optimization
        optimization_rules = {
            "personal": {
                "Food & Dining": 0.85,  # 15% reduction potential
                "Entertainment": 0.75,   # 25% reduction potential
                "Shopping": 0.80,        # 20% reduction potential
                "Subscriptions": 0.90,   # 10% reduction potential
                "Utilities": 0.95,       # 5% reduction potential
                "Transportation": 0.90,  # 10% reduction potential
                "Travel": 0.85,          # 15% reduction potential
            },
            "business": {
                "Meals & Entertainment": 0.90,
                "Software Expenses": 0.95,
                "Cloud Services": 0.95,
                "Marketing & Advertising": 0.85,
                "Office Supplies": 0.90,
                "Travel": 0.90,
                "Training & Development": 0.95,
            }
        }

        rules = optimization_rules.get(account_type, {})
        if category in rules:
            recommended = current_spend * rules[category]

        # Adjust based on trend
        if trend == "up":
            recommended = min(recommended, current_spend * 0.95)  # Push to reduce if trending up
        elif trend == "down":
            recommended = current_spend * 0.95  # Slight reduction to maintain momentum

        # Priority goals may override
        if any(goal in category.lower() for goal in priority_goals):
            recommended = current_spend  # Don't cut priority categories

        return recommended

    def _get_recommendation_reasoning(
        self,
        category: str,
        current_spend: float,
        recommended: float,
        trend: Optional[str],
        count: int,
        account_type: str
    ) -> str:
        """Generate explanation for recommendation."""
        savings = current_spend - recommended

        if savings <= 0:
            return "In line with spending patterns. Maintain current budget."

        if savings < current_spend * 0.1:
            return f"Minimal optimization opportunity ({savings:.0%} reduction possible)."

        if trend == "up":
            return f"Spending is trending up. Opportunity to reduce by {(savings/current_spend*100):.0f}%."

        if count >= 10:
            return f"Frequent spending in this category. Opportunity to optimize by {(savings/current_spend*100):.0f}%."

        return f"Opportunity to reduce spending by ${savings:.2f} ({(savings/current_spend*100):.0f}%)."

    def _calculate_priority(self, category: str, account_type: str) -> str:
        """Determine priority of expense."""
        essential = {
            "personal": ["Utilities", "Healthcare", "Rent", "Transportation", "Insurance"],
            "business": ["Payroll", "Rent & Facilities", "Insurance", "Legal & Compliance"]
        }

        recurring = {
            "personal": ["Subscriptions", "Utilities"],
            "business": ["Software Expenses", "Cloud Services", "Utilities"]
        }

        essentials = essential.get(account_type, [])
        recurrings = recurring.get(account_type, [])

        if any(cat in category for cat in essentials):
            return "essential"
        elif any(cat in category for cat in recurrings):
            return "recurring"
        else:
            return "discretionary"

    def _generate_next_steps(
        self,
        budget_recommendations: Dict,
        total_savings_potential: float,
        monthly_income: Optional[float],
        savings_goal: Optional[float],
        priority_goals: List[str],
        account_type: str
    ) -> List[str]:
        """Generate actionable next steps."""
        steps = []

        # Find categories with highest savings potential
        top_savings = sorted(
            budget_recommendations.items(),
            key=lambda x: x[1]["savings_potential"],
            reverse=True
        )[:3]

        if top_savings and top_savings[0][1]["savings_potential"] > 0:
            for category, data in top_savings:
                if data["savings_potential"] > 0:
                    steps.append(
                        f"Review {category} spending (target: reduce by ${data['savings_potential']:.2f})"
                    )

        # Savings goal feedback
        if savings_goal and total_savings_potential < savings_goal:
            steps.append(
                f"To reach savings goal of ${savings_goal:.2f}, look for additional optimization opportunities"
            )
        elif savings_goal and total_savings_potential >= savings_goal:
            steps.append(
                f"Savings goal achievable: ${total_savings_potential:.2f} in optimization potential identified"
            )

        # Income-based recommendations
        if monthly_income:
            spending_ratio = total_savings_potential / monthly_income if monthly_income > 0 else 0
            if spending_ratio > 0.3:
                steps.append("Consider reducing discretionary spending to improve financial health")

        # Specific recommendations
        if account_type == "personal":
            steps.append("Set up alerts for recurring subscriptions and review quarterly")
        else:
            steps.append("Audit software subscriptions and cloud services for consolidation opportunities")

        # General action items
        if not steps:
            steps.append("Monitor spending patterns and adjust categories as needed")

        return steps

    def _error_response(self, error_msg: str) -> Dict:
        """Return standard error response."""
        return {
            "status": "error",
            "error": error_msg,
            "current_state": {},
            "budget_recommendations": {},
            "total_savings_potential": 0,
            "projected_budget": {},
            "next_steps": []
        }


# CLI interface
if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python planner.py <analysis_json_file> [account_type] [constraints_json_file]")
        sys.exit(1)

    analysis_file = sys.argv[1]
    account_type = sys.argv[2] if len(sys.argv) > 2 else "personal"
    constraints = {}

    if len(sys.argv) > 3:
        with open(sys.argv[3], 'r') as f:
            constraints = json.load(f)

    with open(analysis_file, 'r') as f:
        analysis = json.load(f)

    planner = PlannerAgent()
    result = planner.create_plan(analysis, account_type=account_type, constraints=constraints)

    print(json.dumps(result, indent=2, default=str))

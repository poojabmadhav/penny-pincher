"""
Categorizer Agent for Privacy Budget MVP

Auto-classifies transactions, learns from corrections, detects conflicts.
"""

import json
import os
from typing import List, Dict, Optional, Tuple
from anthropic import Anthropic
from data_models import Transaction, ClassifierState, DEFAULT_PERSONAL_CATEGORIES, DEFAULT_BUSINESS_CATEGORIES
from state_manager import StateManager


class CategorizerAgent:
    def __init__(self, state_dir: Optional[str] = None):
        """
        Initialize categorizer with Claude API and state manager.

        Args:
            state_dir: Directory for storing classifier state
        """
        self.client = Anthropic()
        self.state_manager = StateManager(state_dir)
        self.model = "claude-opus-4-6"

    def categorize_transactions(
        self,
        transactions: List[Dict],
        account_type: str = "personal",
        user_corrections: Optional[Dict[str, str]] = None
    ) -> Dict:
        """
        Categorize transactions with learning and conflict detection.

        Args:
            transactions: List of transaction dicts from parser
            account_type: "personal" or "business"
            user_corrections: {merchant: new_category} for corrections

        Returns:
            {
                "status": "success",
                "categorized_transactions": [...],
                "new_learnings": {},
                "conflicts": [...],
                "confidence_low": [...],
                "parsing_notes": []
            }
        """
        try:
            # Load existing classifier state
            state = self.state_manager.load_state(account_type)

            # Convert dicts to Transaction objects
            txn_objects = [Transaction(**t) if isinstance(t, dict) else t for t in transactions]

            # Get category templates
            categories = DEFAULT_PERSONAL_CATEGORIES if account_type == "personal" else DEFAULT_BUSINESS_CATEGORIES

            # Auto-classify all transactions
            categorized = []
            low_confidence = []
            new_learnings = {}

            for txn in txn_objects:
                # Check if we have a learned category for this merchant
                learned_category = state.get_learned_category(txn.merchant)

                if learned_category:
                    # Use learned category
                    category = learned_category
                    confidence = state.learned_mappings[txn.merchant].confidence
                else:
                    # Ask Claude to classify
                    category, confidence = self._classify_with_claude(
                        txn.merchant,
                        txn.description,
                        categories
                    )

                txn.original_category = category
                txn.user_category = category  # Will be overridden by corrections
                txn.category_confidence = confidence
                txn.type = account_type

                # Track low confidence
                if confidence < 0.7:
                    low_confidence.append({
                        "merchant": txn.merchant,
                        "suggested": category,
                        "confidence": confidence
                    })

                categorized.append(txn)

            # Apply user corrections
            conflicts_detected = []
            if user_corrections:
                for merchant, new_category in user_corrections.items():
                    # Find transactions with this merchant
                    for txn in categorized:
                        if txn.merchant.lower() == merchant.lower():
                            old_category = txn.user_category
                            txn.user_category = new_category

                            # Detect conflict
                            if state.detect_conflict(merchant, new_category):
                                conflict_info = {
                                    "merchant": merchant,
                                    "previous_category": old_category,
                                    "new_category": new_category,
                                    "resolution": "needs_user_decision"
                                }
                                conflicts_detected.append(conflict_info)
                                state.add_conflict(merchant, old_category)
                                state.add_conflict(merchant, new_category)
                            else:
                                # Record learning
                                state.add_learning(merchant, new_category, 0.85)
                                new_learnings[merchant] = new_category

            # Handle conflicts: suggest majority vote
            for merchant in state.conflicts:
                conflict = state.conflicts[merchant]
                if not conflict.resolved:
                    majority = conflict.get_majority_vote()
                    if majority:
                        # Find conflict in detected list and suggest resolution
                        for conf in conflicts_detected:
                            if conf["merchant"] == merchant:
                                conf["suggested_resolution"] = majority
                                break

            # Save updated state
            self.state_manager.save_state(account_type, state)

            # Convert Transaction objects back to dicts
            categorized_dicts = [txn.to_dict() for txn in categorized]

            return {
                "status": "success",
                "account_type": account_type,
                "categorized_transactions": categorized_dicts,
                "new_learnings": new_learnings,
                "conflicts": conflicts_detected,
                "confidence_low": low_confidence,
                "parsing_notes": [
                    f"Categorized {len(categorized)} transactions",
                    f"Detected {len(conflicts_detected)} conflicts",
                    f"Found {len(low_confidence)} low-confidence classifications"
                ]
            }

        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "categorized_transactions": [],
                "new_learnings": {},
                "conflicts": [],
                "confidence_low": []
            }

    def _classify_with_claude(self, merchant: str, description: str, categories: List[str]) -> Tuple[str, float]:
        """
        Use Claude to classify a transaction.

        Args:
            merchant: Merchant name
            description: Full transaction description
            categories: List of valid categories

        Returns:
            (category, confidence) tuple
        """
        try:
            categories_str = "\n".join(f"- {cat}" for cat in categories)

            prompt = f"""Classify this transaction into ONE of the provided categories.

Transaction:
- Merchant: {merchant}
- Description: {description}

Categories:
{categories_str}

Respond ONLY with:
CATEGORY: <exact category name>
CONFIDENCE: <0.0 to 1.0>

Be concise. Pick the most likely category."""

            message = self.client.messages.create(
                model=self.model,
                max_tokens=100,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )

            response_text = message.content[0].text.strip()

            # Parse response
            category = None
            confidence = 0.5

            for line in response_text.split('\n'):
                if line.startswith('CATEGORY:'):
                    category = line.replace('CATEGORY:', '').strip()
                elif line.startswith('CONFIDENCE:'):
                    try:
                        confidence = float(line.replace('CONFIDENCE:', '').strip())
                    except:
                        confidence = 0.5

            # Fallback if parsing fails
            if not category:
                category = categories[0]

            return category, confidence

        except Exception as e:
            print(f"Error classifying {merchant}: {e}")
            return categories[0] if categories else "Other", 0.5

    def resolve_conflict(self, account_type: str, merchant: str, resolved_category: str) -> Dict:
        """
        Resolve a conflict by selecting a category.

        Args:
            account_type: "personal" or "business"
            merchant: Merchant name
            resolved_category: Category to resolve to

        Returns:
            {"status": "success" or "error", "message": "..."}
        """
        try:
            state = self.state_manager.load_state(account_type)
            state.resolve_conflict(merchant, resolved_category)
            self.state_manager.save_state(account_type, state)

            return {
                "status": "success",
                "message": f"Resolved {merchant} to {resolved_category}"
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e)
            }

    def get_state_summary(self, account_type: str) -> Dict:
        """Get summary of learned mappings and conflicts."""
        try:
            state = self.state_manager.load_state(account_type)

            return {
                "status": "success",
                "account_type": account_type,
                "total_learned": len(state.learned_mappings),
                "total_conflicts": len(state.conflicts),
                "unresolved_conflicts": sum(1 for c in state.conflicts.values() if not c.resolved),
                "learned_mappings": {
                    merchant: {
                        "category": mapping.category,
                        "confidence": mapping.confidence,
                        "count": mapping.count
                    }
                    for merchant, mapping in state.learned_mappings.items()
                },
                "conflicts": {
                    merchant: {
                        "categories": conflict.categories,
                        "resolved": conflict.resolved,
                        "resolved_to": conflict.resolved_category
                    }
                    for merchant, conflict in state.conflicts.items()
                }
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e)
            }


# CLI interface
if __name__ == "__main__":
    import sys
    from parser import ParserAgent

    if len(sys.argv) < 3:
        print("Usage: python categorizer.py <csv_file> <personal|business> [corrections_json]")
        sys.exit(1)

    csv_file = sys.argv[1]
    account_type = sys.argv[2]
    corrections = {}

    if len(sys.argv) > 3:
        with open(sys.argv[3], 'r') as f:
            corrections = json.load(f)

    # Parse transactions
    parser = ParserAgent()
    parse_result = parser.parse_file(csv_file)

    if parse_result["status"] != "success":
        print(f"Parse error: {parse_result['errors']}")
        sys.exit(1)

    # Categorize
    categorizer = CategorizerAgent()
    result = categorizer.categorize_transactions(
        parse_result["transactions"],
        account_type=account_type,
        user_corrections=corrections
    )

    print(json.dumps(result, indent=2, default=str))

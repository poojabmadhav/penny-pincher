"""
Data Models for Privacy Budget MVP

Defines Transaction, Category, and ClassifierState structures.
"""

from dataclasses import dataclass, asdict, field
from typing import List, Optional, Dict
from datetime import datetime


@dataclass
class Transaction:
    """Represents a single transaction."""
    date: str  # YYYY-MM-DD
    merchant: str
    amount: float
    description: str
    source: str  # wells_fargo_csv, amex_csv, etc.
    original_category: Optional[str] = None  # Auto-classified category
    user_category: Optional[str] = None  # User-corrected category
    type: Optional[str] = None  # personal, business
    category_confidence: Optional[float] = None  # 0-1

    def to_dict(self) -> Dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict) -> 'Transaction':
        return cls(**data)


@dataclass
class CategoryMapping:
    """Represents learned mapping: merchant -> category."""
    merchant: str
    category: str
    count: int = 1  # Number of times seen
    confidence: float = 0.7  # 0-1
    last_seen: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> Dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict) -> 'CategoryMapping':
        return cls(**data)


@dataclass
class MerchantConflict:
    """Represents a conflict: same merchant with different categories."""
    merchant: str
    categories: Dict[str, int]  # {category: count}
    first_seen: str = field(default_factory=lambda: datetime.now().isoformat())
    resolved: bool = False
    resolved_category: Optional[str] = None

    def to_dict(self) -> Dict:
        data = asdict(self)
        return data

    @classmethod
    def from_dict(cls, data: Dict) -> 'MerchantConflict':
        return cls(**data)

    def get_majority_vote(self) -> Optional[str]:
        """Return category with highest count."""
        if not self.categories:
            return None
        return max(self.categories.items(), key=lambda x: x[1])[0]


@dataclass
class ClassifierState:
    """Stores learned mappings and conflicts for a user (personal or business)."""
    version: str = "1.0"
    last_updated: str = field(default_factory=lambda: datetime.now().isoformat())

    # Merchant -> CategoryMapping
    learned_mappings: Dict[str, CategoryMapping] = field(default_factory=dict)

    # Merchant -> MerchantConflict
    conflicts: Dict[str, MerchantConflict] = field(default_factory=dict)

    def to_dict(self) -> Dict:
        return {
            "version": self.version,
            "last_updated": self.last_updated,
            "learned_mappings": {
                merchant: mapping.to_dict()
                for merchant, mapping in self.learned_mappings.items()
            },
            "conflicts": {
                merchant: conflict.to_dict()
                for merchant, conflict in self.conflicts.items()
            }
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'ClassifierState':
        instance = cls(
            version=data.get("version", "1.0"),
            last_updated=data.get("last_updated", datetime.now().isoformat())
        )

        # Load learned mappings
        for merchant, mapping_data in data.get("learned_mappings", {}).items():
            instance.learned_mappings[merchant] = CategoryMapping.from_dict(mapping_data)

        # Load conflicts
        for merchant, conflict_data in data.get("conflicts", {}).items():
            instance.conflicts[merchant] = MerchantConflict.from_dict(conflict_data)

        return instance

    def get_learned_category(self, merchant: str) -> Optional[str]:
        """Get learned category for merchant."""
        if merchant in self.learned_mappings:
            return self.learned_mappings[merchant].category
        return None

    def add_learning(self, merchant: str, category: str, confidence: float = 0.8):
        """Record a learning: merchant -> category."""
        if merchant in self.learned_mappings:
            # Update existing mapping
            mapping = self.learned_mappings[merchant]
            mapping.count += 1
            mapping.confidence = min(1.0, mapping.confidence + 0.1)  # Increase confidence
            mapping.last_seen = datetime.now().isoformat()
        else:
            # New mapping
            self.learned_mappings[merchant] = CategoryMapping(
                merchant=merchant,
                category=category,
                count=1,
                confidence=confidence
            )

    def detect_conflict(self, merchant: str, new_category: str) -> bool:
        """Check if merchant has different category than learned."""
        learned = self.get_learned_category(merchant)
        if learned and learned != new_category:
            return True
        return False

    def add_conflict(self, merchant: str, category: str):
        """Record a conflict for a merchant."""
        if merchant not in self.conflicts:
            self.conflicts[merchant] = MerchantConflict(merchant=merchant, categories={})

        conflict = self.conflicts[merchant]
        if category not in conflict.categories:
            conflict.categories[category] = 0
        conflict.categories[category] += 1

    def resolve_conflict(self, merchant: str, resolved_category: str):
        """Resolve a conflict by selecting a category."""
        if merchant in self.conflicts:
            conflict = self.conflicts[merchant]
            conflict.resolved = True
            conflict.resolved_category = resolved_category

            # Update learned mapping to resolved category
            if merchant in self.learned_mappings:
                self.learned_mappings[merchant].category = resolved_category
            else:
                self.add_learning(merchant, resolved_category, confidence=0.95)


# Default category templates
DEFAULT_PERSONAL_CATEGORIES = [
    "Food & Dining",
    "Transportation",
    "Utilities",
    "Entertainment",
    "Shopping",
    "Healthcare",
    "Personal Care",
    "Education",
    "Travel",
    "Home & Garden",
    "Gifts & Donations",
    "Subscriptions",
    "Transfer",
    "Other"
]

DEFAULT_BUSINESS_CATEGORIES = [
    "Payroll",
    "Software Expenses",
    "Cloud Services",
    "Professional Services",
    "Marketing & Advertising",
    "Office Supplies",
    "Equipment",
    "Travel",
    "Meals & Entertainment",
    "Utilities",
    "Insurance",
    "Legal & Compliance",
    "Rent & Facilities",
    "Contractor Payments",
    "Business Meals",
    "Training & Development",
    "Transfer",
    "Other"
]

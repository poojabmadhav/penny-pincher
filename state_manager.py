"""
State Manager for Privacy Budget MVP

Handles persistence of classifier state (learned mappings, conflicts).
"""

import json
from pathlib import Path
from typing import Optional
from data_models import ClassifierState


class StateManager:
    """Manages loading and saving classifier state to JSON files."""

    def __init__(self, state_dir: Optional[str] = None):
        """
        Initialize state manager.

        Args:
            state_dir: Directory to store state files. Defaults to ~/.privacy-budget/state/
        """
        if state_dir is None:
            state_dir = str(Path.home() / ".privacy-budget" / "state")

        self.state_dir = Path(state_dir)
        self.state_dir.mkdir(parents=True, exist_ok=True)

    def get_state_file(self, account_type: str) -> Path:
        """
        Get path to state file for account type.

        Args:
            account_type: "personal" or "business"

        Returns:
            Path to state file
        """
        if account_type not in ["personal", "business"]:
            raise ValueError(f"Invalid account type: {account_type}")

        return self.state_dir / f"classifier_state_{account_type}.json"

    def load_state(self, account_type: str) -> ClassifierState:
        """
        Load classifier state from disk.

        Args:
            account_type: "personal" or "business"

        Returns:
            ClassifierState object, or empty state if file doesn't exist
        """
        state_file = self.get_state_file(account_type)

        if not state_file.exists():
            return ClassifierState()

        try:
            with open(state_file, 'r') as f:
                data = json.load(f)
            return ClassifierState.from_dict(data)
        except Exception as e:
            print(f"Warning: Could not load state from {state_file}: {e}")
            return ClassifierState()

    def save_state(self, account_type: str, state: ClassifierState):
        """
        Save classifier state to disk.

        Args:
            account_type: "personal" or "business"
            state: ClassifierState object to save
        """
        state_file = self.get_state_file(account_type)

        try:
            with open(state_file, 'w') as f:
                json.dump(state.to_dict(), f, indent=2)
        except Exception as e:
            print(f"Warning: Could not save state to {state_file}: {e}")

    def delete_state(self, account_type: str):
        """Delete classifier state file."""
        state_file = self.get_state_file(account_type)
        if state_file.exists():
            state_file.unlink()

    def list_states(self) -> list:
        """List all saved states."""
        return [f.name for f in self.state_dir.glob("classifier_state_*.json")]


if __name__ == "__main__":
    # Test state persistence
    manager = StateManager()

    # Create and save a test state
    state = ClassifierState()
    state.add_learning("Slack", "Software Expenses", 0.95)
    state.add_learning("Starbucks", "Food & Dining", 0.85)

    manager.save_state("personal", state)
    print("Saved test state")

    # Load and verify
    loaded = manager.load_state("personal")
    print(f"Loaded state with {len(loaded.learned_mappings)} learned mappings")
    print(f"Learned: Slack -> {loaded.get_learned_category('Slack')}")
    print(f"Learned: Starbucks -> {loaded.get_learned_category('Starbucks')}")

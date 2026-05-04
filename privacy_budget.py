#!/usr/bin/env python3
"""
Privacy Budget MVP - Main CLI Entry Point

Coordinates all agents: Parser, Categorizer, Analyzer, Planner, Dashboard Generator
"""

import sys
import json
import argparse
from pathlib import Path
from datetime import datetime
from parser import ParserAgent
from categorizer import CategorizerAgent
from analyzer import AnalyzerAgent
from planner import PlannerAgent
from state_manager import StateManager
from dashboard_generator import DashboardGenerator


class PrivacyBudgetCLI:
    def __init__(self):
        self.parser = ParserAgent()
        self.categorizer = CategorizerAgent()
        self.analyzer = AnalyzerAgent()
        self.planner = PlannerAgent()
        self.dashboard = DashboardGenerator()
        self.state_manager = StateManager()

    def parse(self, args):
        """Parse a CSV statement."""
        print(f"Parsing {args.file}...")
        result = self.parser.parse_file(args.file)

        if result["status"] == "success":
            print(f"✓ Extracted {result['transaction_count']} transactions")
            print(f"✓ Format detected: {result['format']}")

            # Save to JSON for next step
            output_file = self._generate_output_filename(f"{Path(args.file).stem}_parsed.json")
            with open(output_file, 'w') as f:
                json.dump(result["transactions"], f, indent=2)
            print(f"✓ Saved to: {output_file}")
        else:
            print(f"✗ Error: {result['errors'][0]}")
            sys.exit(1)

    def categorize(self, args):
        """Categorize transactions."""
        print(f"Categorizing transactions ({args.type} mode)...")

        # Load transactions
        with open(args.file, 'r') as f:
            transactions = json.load(f)

        # Load corrections if provided
        corrections = {}
        if args.corrections:
            with open(args.corrections, 'r') as f:
                corrections = json.load(f)
                print(f"✓ Applying {len(corrections)} corrections")

        result = self.categorizer.categorize_transactions(
            transactions,
            account_type=args.type,
            user_corrections=corrections
        )

        if result["status"] == "success":
            print(f"✓ Categorized {len(result['categorized_transactions'])} transactions")

            if result['conflicts']:
                print(f"⚠ Detected {len(result['conflicts'])} conflicts:")
                for conflict in result['conflicts']:
                    print(f"  - {conflict['merchant']}: {conflict['previous_category']} vs {conflict['new_category']}")

            # Save results
            output_file = self._generate_output_filename(f"{Path(args.file).stem}_categorized.json")
            with open(output_file, 'w') as f:
                json.dump(result["categorized_transactions"], f, indent=2, default=str)
            print(f"✓ Saved to: {output_file}")

            if result["new_learnings"]:
                print(f"✓ Learned: {list(result['new_learnings'].keys())}")
        else:
            print(f"✗ Error: {result['error']}")
            sys.exit(1)

    def analyze(self, args):
        """Analyze transactions."""
        print(f"Analyzing transactions ({args.type} mode)...")

        # Load transactions
        with open(args.file, 'r') as f:
            transactions = json.load(f)

        result = self.analyzer.analyze(
            transactions,
            account_type=args.type,
            time_period=args.period
        )

        if result["status"] == "success":
            summary = result["summary"]
            print(f"✓ Summary:")
            print(f"  - Total: ${summary['total_spent']:.2f}")
            print(f"  - Transactions: {summary['transaction_count']}")
            print(f"  - Period: {summary['date_range']}")

            print(f"✓ Top spending categories:")
            by_cat = result["by_category"]
            for cat in list(by_cat.keys())[:5]:
                print(f"  - {cat}: ${abs(by_cat[cat]['total']):.2f}")

            if result["anomalies"]:
                print(f"⚠ Anomalies detected:")
                for anom in result["anomalies"][:3]:
                    print(f"  - {anom['merchant']}: ${anom['amount']:.2f} ({anom['reason']})")

            # Save results
            output_file = self._generate_output_filename(f"{Path(args.file).stem}_analysis.json")
            with open(output_file, 'w') as f:
                json.dump(result, f, indent=2, default=str)
            print(f"✓ Saved to: {output_file}")
        else:
            print(f"✗ Error: {result['error']}")
            sys.exit(1)

    def plan(self, args):
        """Create budget plan."""
        print(f"Creating budget plan ({args.type} mode)...")

        # Load analysis
        with open(args.file, 'r') as f:
            analysis = json.load(f)

        # Load constraints if provided
        constraints = {}
        if args.constraints:
            with open(args.constraints, 'r') as f:
                constraints = json.load(f)
                print(f"✓ Using constraints: income=${constraints.get('monthly_income')}")

        result = self.planner.create_plan(
            analysis,
            account_type=args.type,
            constraints=constraints
        )

        if result["status"] == "success":
            print(f"✓ Budget plan created:")
            print(f"  - Current spending: ${result['current_state']['total_spent']:.2f}")
            print(f"  - Savings potential: ${result['total_savings_potential']:.2f}")
            print(f"  - Projected monthly: ${result['projected_budget']['monthly']:.2f}")

            print(f"✓ Next steps:")
            for step in result["next_steps"][:3]:
                print(f"  - {step}")

            # Save with timestamp
            timestamp = datetime.now().strftime("%B_%d_%Y").lower()
            output_file = f"{timestamp}_{args.type}_budget.json"
            with open(output_file, 'w') as f:
                json.dump(result, f, indent=2, default=str)
            print(f"✓ Saved to: {output_file}")
        else:
            print(f"✗ Error: {result['error']}")
            sys.exit(1)

    def show_state(self, args):
        """Show learned classifications."""
        result = self.categorizer.get_state_summary(args.type)

        if result["status"] == "success":
            print(f"\nClassifier State for {args.type}:")
            print(f"✓ Learned mappings: {result['total_learned']}")
            print(f"✓ Unresolved conflicts: {result['unresolved_conflicts']}")

            if result["learned_mappings"]:
                print(f"\nLearned Classifications:")
                for merchant, mapping in list(result["learned_mappings"].items())[:10]:
                    print(f"  {merchant} → {mapping['category']} (confidence: {mapping['confidence']:.2f})")
        else:
            print(f"✗ Error: {result['message']}")
            sys.exit(1)

    def reset_state(self, args):
        """Reset learned state."""
        self.state_manager.delete_state(args.type)
        print(f"✓ Reset {args.type} classifier state")

    def full_pipeline(self, args):
        """Run complete pipeline: Parse → Categorize → Analyze → Plan → Dashboard."""
        print("\n" + "="*60)
        print("  PRIVACY BUDGET - COMPLETE PIPELINE")
        print("="*60 + "\n")

        account_type = args.type

        try:
            # Step 1: Parse
            print("📄 STEP 1: Parsing statement...")
            parse_result = self.parser.parse_file(args.file)
            if parse_result["status"] != "success":
                print(f"✗ Parse failed: {parse_result['errors'][0]}")
                sys.exit(1)
            print(f"✓ Extracted {parse_result['transaction_count']} transactions")
            transactions = parse_result["transactions"]

            # Step 2: Categorize
            print("\n🏷️  STEP 2: Categorizing transactions...")
            cat_result = self.categorizer.categorize_transactions(
                transactions,
                account_type=account_type,
                user_corrections=None
            )
            if cat_result["status"] != "success":
                print(f"✗ Categorization failed: {cat_result['error']}")
                sys.exit(1)
            print(f"✓ Categorized {len(cat_result['categorized_transactions'])} transactions")
            categorized = cat_result["categorized_transactions"]

            # Step 3: Analyze
            print("\n📊 STEP 3: Analyzing spending...")
            analysis_result = self.analyzer.analyze(
                categorized,
                account_type=account_type
            )
            if analysis_result["status"] != "success":
                print(f"✗ Analysis failed: {analysis_result['error']}")
                sys.exit(1)
            summary = analysis_result["summary"]
            print(f"✓ Analysis complete: ${summary['total_spent']:,.2f} analyzed")

            # Step 4: Plan
            print("\n💡 STEP 4: Creating budget plan...")
            plan_result = self.planner.create_plan(
                analysis_result,
                account_type=account_type
            )
            if plan_result["status"] != "success":
                print(f"✗ Planning failed: {plan_result['error']}")
                sys.exit(1)
            savings = plan_result["total_savings_potential"]
            print(f"✓ Budget plan created: ${savings:,.2f} savings identified")

            # Save intermediate JSON files
            parsed_file = self._generate_output_filename(f"{Path(args.file).stem}_parsed.json")
            categorized_file = self._generate_output_filename(f"{Path(args.file).stem}_categorized.json")
            analysis_file = self._generate_output_filename(f"{Path(args.file).stem}_analysis.json")
            plan_file = self._generate_output_filename(f"{Path(args.file).stem}_plan.json")

            with open(parsed_file, 'w') as f:
                json.dump(transactions, f, indent=2)
            with open(categorized_file, 'w') as f:
                json.dump(categorized, f, indent=2, default=str)
            with open(analysis_file, 'w') as f:
                json.dump(analysis_result, f, indent=2, default=str)
            with open(plan_file, 'w') as f:
                json.dump(plan_result, f, indent=2, default=str)

            # Step 5: Generate Dashboard
            print("\n🎨 STEP 5: Generating dashboard...")
            dashboard_file = self.dashboard.generate(
                analysis_file,
                plan_file,
                account_type=account_type
            )
            print(f"✓ Dashboard generated: {dashboard_file}")

            # Summary
            print("\n" + "="*60)
            print("  ✓ PIPELINE COMPLETE")
            print("="*60)
            print(f"\n📊 Results Summary:")
            print(f"  • Total Spending: ${summary['total_spent']:,.2f}")
            print(f"  • Savings Potential: ${savings:,.2f}")
            print(f"  • Recommended Budget: ${summary['total_spent'] - savings:,.2f}")
            print(f"\n📁 Files Created:")
            print(f"  1. {parsed_file}")
            print(f"  2. {categorized_file}")
            print(f"  3. {analysis_file}")
            print(f"  4. {plan_file}")
            print(f"  5. {dashboard_file}")
            print(f"\n🌐 Open the dashboard:")
            print(f"  open {dashboard_file}")
            print(f"\n" + "="*60 + "\n")

        except Exception as e:
            print(f"✗ Pipeline failed: {str(e)}")
            sys.exit(1)

    def _generate_output_filename(self, base_name: str) -> str:
        """Generate unique output filename."""
        path = Path(base_name)
        counter = 1
        while path.exists():
            path = Path(f"{path.stem}_{counter}{path.suffix}")
            counter += 1
        return str(path)


def main():
    parser = argparse.ArgumentParser(
        description="Privacy Budget - Privacy-first financial budgeting",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Quick Start (One Command):
  privacy-budget full-pipeline april_statement.csv personal

Advanced (Step by Step):
  privacy-budget parse april_statement.csv
  privacy-budget categorize april_parsed.json personal
  privacy-budget analyze april_categorized.json personal
  privacy-budget plan april_analysis.json personal
  privacy-budget dashboard april_analysis.json april_plan.json personal

Manage Learning:
  privacy-budget show-state personal
  privacy-budget reset-state personal

Note: 'full-pipeline' does everything automatically and generates an HTML dashboard!
        """
    )

    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # Full Pipeline command (ONE COMMAND TO RULE THEM ALL)
    pipeline_parser = subparsers.add_parser(
        "full-pipeline",
        help="Run complete pipeline: Parse → Categorize → Analyze → Plan → Dashboard"
    )
    pipeline_parser.add_argument("file", help="CSV statement file")
    pipeline_parser.add_argument(
        "--type", "-t", default="personal", choices=["personal", "business"],
        help="Account type (default: personal)"
    )

    # Parse command
    parse_parser = subparsers.add_parser("parse", help="Parse CSV statement")
    parse_parser.add_argument("file", help="CSV file to parse")

    # Categorize command
    cat_parser = subparsers.add_parser("categorize", help="Categorize transactions")
    cat_parser.add_argument("file", help="Transactions JSON file")
    cat_parser.add_argument(
        "--type", "-t", default="personal", choices=["personal", "business"],
        help="Account type"
    )
    cat_parser.add_argument(
        "--corrections", "-c", help="JSON file with corrections {merchant: category}"
    )

    # Analyze command
    analyze_parser = subparsers.add_parser("analyze", help="Analyze transactions")
    analyze_parser.add_argument("file", help="Categorized transactions JSON file")
    analyze_parser.add_argument(
        "--type", "-t", default="personal", choices=["personal", "business"],
        help="Account type"
    )
    analyze_parser.add_argument(
        "--period", "-p", default="monthly", choices=["monthly", "quarterly", "annual"],
        help="Time period"
    )

    # Plan command
    plan_parser = subparsers.add_parser("plan", help="Create budget plan")
    plan_parser.add_argument("file", help="Analysis JSON file")
    plan_parser.add_argument(
        "--type", "-t", default="personal", choices=["personal", "business"],
        help="Account type"
    )
    plan_parser.add_argument(
        "--constraints", "-c", help="JSON file with constraints"
    )

    # Show state command
    state_parser = subparsers.add_parser("show-state", help="Show learned classifications")
    state_parser.add_argument(
        "--type", "-t", default="personal", choices=["personal", "business"],
        help="Account type"
    )

    # Reset state command
    reset_parser = subparsers.add_parser("reset-state", help="Reset classifier state")
    reset_parser.add_argument(
        "--type", "-t", default="personal", choices=["personal", "business"],
        help="Account type"
    )

    # Dashboard command
    dashboard_parser = subparsers.add_parser("dashboard", help="Generate HTML dashboard from analysis")
    dashboard_parser.add_argument("analysis_file", help="Analysis JSON file")
    dashboard_parser.add_argument("plan_file", help="Budget plan JSON file")
    dashboard_parser.add_argument(
        "--type", "-t", default="personal", choices=["personal", "business"],
        help="Account type"
    )

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    cli = PrivacyBudgetCLI()

    if args.command == "full-pipeline":
        cli.full_pipeline(args)
    elif args.command == "parse":
        cli.parse(args)
    elif args.command == "categorize":
        cli.categorize(args)
    elif args.command == "analyze":
        cli.analyze(args)
    elif args.command == "plan":
        cli.plan(args)
    elif args.command == "dashboard":
        dashboard_file = cli.dashboard.generate(args.analysis_file, args.plan_file, args.type)
        print(f"✓ Dashboard generated: {dashboard_file}")
    elif args.command == "show-state":
        cli.show_state(args)
    elif args.command == "reset-state":
        cli.reset_state(args)


if __name__ == "__main__":
    main()

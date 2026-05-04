"""
Parser Agent for Privacy Budget MVP

Extracts transactions from CSV bank statements.
Supports:
- Wells Fargo CSV format
- American Express CSV format
"""

import csv
import json
from datetime import datetime
from typing import List, Dict, Tuple
from pathlib import Path


class ParserAgent:
    def __init__(self):
        self.supported_formats = ['wells_fargo', 'amex', 'generic_cc']

    def parse_file(self, file_path: str) -> Dict:
        """
        Parse a CSV file and return structured transactions.

        Args:
            file_path: Path to CSV file

        Returns:
            {
                "status": "success" or "error",
                "format": "wells_fargo" or "amex",
                "transaction_count": int,
                "transactions": [...],
                "parsing_notes": [...],
                "errors": [...]
            }
        """
        try:
            file_path = Path(file_path)
            if not file_path.exists():
                return self._error_response(f"File not found: {file_path}")

            if not file_path.suffix.lower() == '.csv':
                return self._error_response(f"File must be CSV format, got: {file_path.suffix}")

            # Read CSV content
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # Detect format
            detected_format = self._detect_format(content)
            if not detected_format:
                return self._error_response("Could not detect CSV format (not Wells Fargo or AmEx)")

            # Parse based on format
            if detected_format == 'wells_fargo':
                result = self._parse_wells_fargo(content)
            elif detected_format == 'amex':
                result = self._parse_amex(content)
            elif detected_format == 'generic_cc':
                result = self._parse_generic_cc(content)

            result['format'] = detected_format
            return result

        except Exception as e:
            return self._error_response(f"Parser error: {str(e)}")

    def _detect_format(self, content: str) -> str | None:
        """
        Detect CSV format by examining headers and structure.
        """
        lines = content.strip().split('\n')
        if not lines:
            return None

        first_line = lines[0]

        # Check for AmEx format (has "Description" and "Status" headers)
        if 'Description' in first_line and 'Status' in first_line:
            return 'amex'

        # Check for generic credit card format (Posted Date and Payee)
        if 'Posted Date' in first_line and 'Payee' in first_line and 'Amount' in first_line:
            return 'generic_cc'

        # Check for Wells Fargo format
        # Wells Fargo has quoted dates and amounts
        if first_line.startswith('"') and '"-' in content[:200]:
            return 'wells_fargo'

        # Fallback: try to detect by structure
        if 'Amount' in first_line or 'Currency' in first_line:
            return 'amex'

        return None

    def _parse_wells_fargo(self, content: str) -> Dict:
        """
        Parse Wells Fargo CSV format.
        Format: Date, Amount (signed), Status, Check#, Description
        """
        transactions = []
        errors = []
        parsing_notes = []

        try:
            reader = csv.reader(content.strip().split('\n'))
            rows = list(reader)

            if not rows:
                return self._error_response("Empty CSV file")

            # Wells Fargo doesn't have headers, so parse all rows
            for idx, row in enumerate(rows):
                if len(row) < 5:
                    errors.append(f"Row {idx + 1}: Insufficient columns (expected 5, got {len(row)})")
                    continue

                try:
                    date_str = row[0].strip().strip('"')
                    amount_str = row[1].strip().strip('"')
                    # row[2] is status (*)
                    # row[3] is check number
                    description = row[4].strip().strip('"') if len(row) > 4 else ""

                    # Parse date
                    try:
                        date_obj = datetime.strptime(date_str, '%m/%d/%Y')
                        date_normalized = date_obj.strftime('%Y-%m-%d')
                    except ValueError:
                        errors.append(f"Row {idx + 1}: Invalid date format: {date_str}")
                        continue

                    # Parse amount
                    try:
                        amount = float(amount_str)
                    except ValueError:
                        errors.append(f"Row {idx + 1}: Invalid amount: {amount_str}")
                        continue

                    # Extract merchant from description
                    merchant = self._extract_merchant(description)

                    transaction = {
                        "date": date_normalized,
                        "merchant": merchant,
                        "amount": amount,
                        "description": description,
                        "source": "wells_fargo_csv"
                    }
                    transactions.append(transaction)

                except Exception as e:
                    errors.append(f"Row {idx + 1}: {str(e)}")

            if not transactions:
                return self._error_response("No valid transactions found")

            if errors:
                parsing_notes.append(f"Encountered {len(errors)} parsing errors")

            return {
                "status": "success",
                "transaction_count": len(transactions),
                "transactions": transactions,
                "parsing_notes": parsing_notes,
                "errors": errors[:10]  # Limit error reporting
            }

        except Exception as e:
            return self._error_response(f"Wells Fargo parsing error: {str(e)}")

    def _parse_amex(self, content: str) -> Dict:
        """
        Parse American Express CSV format.
        Format: Date, Description, Status, Currency, Amount, Ending Balance, Reference
        """
        transactions = []
        errors = []
        parsing_notes = []

        try:
            reader = csv.DictReader(content.strip().split('\n'))
            rows = list(reader)

            if not rows:
                return self._error_response("Empty CSV file or invalid headers")

            for idx, row in enumerate(rows, start=2):  # Start at 2 (after header)
                try:
                    date_str = row.get('Date', '').strip()
                    description = row.get('Description', '').strip()
                    amount_str = row.get('Amount', '').strip()

                    if not all([date_str, description, amount_str]):
                        errors.append(f"Row {idx}: Missing required fields")
                        continue

                    # Parse date
                    try:
                        date_obj = datetime.strptime(date_str, '%m/%d/%Y')
                        date_normalized = date_obj.strftime('%Y-%m-%d')
                    except ValueError:
                        errors.append(f"Row {idx}: Invalid date format: {date_str}")
                        continue

                    # Parse amount
                    try:
                        amount = float(amount_str)
                    except ValueError:
                        errors.append(f"Row {idx}: Invalid amount: {amount_str}")
                        continue

                    # Extract merchant from description
                    merchant = self._extract_merchant(description)

                    transaction = {
                        "date": date_normalized,
                        "merchant": merchant,
                        "amount": amount,
                        "description": description,
                        "source": "amex_csv"
                    }
                    transactions.append(transaction)

                except Exception as e:
                    errors.append(f"Row {idx}: {str(e)}")

            if not transactions:
                return self._error_response("No valid transactions found")

            if errors:
                parsing_notes.append(f"Encountered {len(errors)} parsing errors")

            return {
                "status": "success",
                "transaction_count": len(transactions),
                "transactions": transactions,
                "parsing_notes": parsing_notes,
                "errors": errors[:10]
            }

        except Exception as e:
            return self._error_response(f"AmEx parsing error: {str(e)}")

    def _parse_generic_cc(self, content: str) -> Dict:
        """
        Parse generic credit card CSV format.
        Format: Posted Date, Reference Number, Payee, Address, Amount
        """
        transactions = []
        errors = []
        parsing_notes = []

        try:
            reader = csv.DictReader(content.strip().split('\n'))
            rows = list(reader)

            if not rows:
                return self._error_response("Empty CSV file or invalid headers")

            for idx, row in enumerate(rows, start=2):  # Start at 2 (after header)
                try:
                    date_str = row.get('Posted Date', '').strip()
                    payee = row.get('Payee', '').strip()
                    amount_str = row.get('Amount', '').strip()

                    if not all([date_str, payee, amount_str]):
                        errors.append(f"Row {idx}: Missing required fields")
                        continue

                    # Parse date
                    try:
                        date_obj = datetime.strptime(date_str, '%m/%d/%Y')
                        date_normalized = date_obj.strftime('%Y-%m-%d')
                    except ValueError:
                        errors.append(f"Row {idx}: Invalid date format: {date_str}")
                        continue

                    # Parse amount
                    try:
                        amount = float(amount_str)
                    except ValueError:
                        errors.append(f"Row {idx}: Invalid amount: {amount_str}")
                        continue

                    # Extract merchant from payee
                    merchant = self._extract_merchant(payee)

                    transaction = {
                        "date": date_normalized,
                        "merchant": merchant,
                        "amount": amount,
                        "description": payee,
                        "source": "generic_cc_csv"
                    }
                    transactions.append(transaction)

                except Exception as e:
                    errors.append(f"Row {idx}: {str(e)}")

            if not transactions:
                return self._error_response("No valid transactions found")

            if errors:
                parsing_notes.append(f"Encountered {len(errors)} parsing errors")

            return {
                "status": "success",
                "transaction_count": len(transactions),
                "transactions": transactions,
                "parsing_notes": parsing_notes,
                "errors": errors[:10]
            }

        except Exception as e:
            return self._error_response(f"Generic CC parsing error: {str(e)}")

    def _extract_merchant(self, description: str) -> str:
        """
        Extract merchant name from transaction description.
        This is a simple heuristic; can be improved.
        """
        if not description:
            return "Unknown"

        # Remove common prefixes
        desc = description
        prefixes = [
            'ACH DEPOSIT', 'ACH WITHDRAWAL', 'ATM', 'CHECK #', 'WIRE TRANSFER',
            'ONLINE TRANSFER', 'ZELLE', 'VENMO', 'AMERICAN EXPRESS', 'CITI',
            'DIRECT PAYMENT', 'AUTO PAY', 'TRANSFER', 'PAYMENT'
        ]

        for prefix in prefixes:
            if desc.startswith(prefix):
                desc = desc[len(prefix):].strip()
                break

        # Extract first meaningful phrase
        words = desc.split()
        if words:
            # Try to find a company name (usually first 1-3 words)
            merchant = ' '.join(words[:3]) if len(words) >= 3 else ' '.join(words[:2]) if len(words) >= 2 else words[0]
            # Remove trailing common words
            merchant = merchant.rstrip('.-,')
            return merchant if merchant else "Unknown"

        return "Unknown"

    def _error_response(self, error_msg: str) -> Dict:
        """Return a standard error response."""
        return {
            "status": "error",
            "format": None,
            "transaction_count": 0,
            "transactions": [],
            "parsing_notes": [],
            "errors": [error_msg]
        }


# CLI interface
if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python parser.py <csv_file>")
        sys.exit(1)

    file_path = sys.argv[1]
    parser = ParserAgent()
    result = parser.parse_file(file_path)

    print(json.dumps(result, indent=2))

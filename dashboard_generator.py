"""
Dashboard Generator for Privacy Budget MVP

Converts JSON analysis/budget outputs into beautiful, interactive HTML reports.
No dependencies required - generates standalone HTML file.
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Optional


class DashboardGenerator:
    def __init__(self):
        self.template = self._build_html_template()

    def generate(
        self,
        analysis_file: str,
        budget_file: str,
        account_type: str = "personal",
        output_file: Optional[str] = None
    ) -> str:
        """
        Generate HTML dashboard from analysis and budget JSON files.

        Args:
            analysis_file: Path to analysis.json from Analyzer
            budget_file: Path to budget.json from Planner
            account_type: "personal" or "business"
            output_file: Path for output HTML (auto-generated if not provided)

        Returns:
            Path to generated HTML file
        """
        try:
            # Load JSON data
            with open(analysis_file, 'r') as f:
                analysis = json.load(f)
            with open(budget_file, 'r') as f:
                budget = json.load(f)

            # Generate output filename if not provided
            if not output_file:
                timestamp = datetime.now().strftime("%B_%d_%Y").lower()
                output_file = f"{timestamp}_{account_type}_dashboard.html"

            # Prepare data for dashboard
            data = {
                "account_type": account_type,
                "summary": analysis.get("summary", {}),
                "by_category": analysis.get("by_category", {}),
                "anomalies": analysis.get("anomalies", []),
                "top_merchants": analysis.get("top_merchants", []),
                "insights": analysis.get("insights", []),
                "budget": budget.get("budget_recommendations", {}),
                "savings_potential": budget.get("total_savings_potential", 0),
                "projections": budget.get("projected_budget", {}),
                "next_steps": budget.get("next_steps", []),
            }

            # Generate HTML
            html_content = self._render_dashboard(data)

            # Write to file
            with open(output_file, 'w') as f:
                f.write(html_content)

            return output_file

        except Exception as e:
            print(f"Error generating dashboard: {e}")
            raise

    def _render_dashboard(self, data: Dict) -> str:
        """Render dashboard HTML with data."""
        summary = data["summary"]
        by_category = data["by_category"]
        anomalies = data["anomalies"]
        top_merchants = data["top_merchants"]
        budget = data["budget"]
        savings = data["savings_potential"]
        projections = data["projections"]
        next_steps = data["next_steps"]

        # Prepare data for charts
        categories = list(by_category.keys())
        category_amounts = [abs(by_category[cat]["total"]) for cat in categories]
        category_colors = self._generate_colors(len(categories))

        merchant_names = [m["merchant"] for m in top_merchants[:5]]
        merchant_amounts = [m["total"] for m in top_merchants[:5]]

        # Build HTML
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Budget Dashboard - {data['account_type'].title()}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        {self._get_css()}
    </style>
</head>
<body>
    <div class="container">
        {self._render_header(data)}
        {self._render_summary_cards(summary, savings, projections)}
        {self._render_charts(categories, category_amounts, category_colors, merchant_names, merchant_amounts)}
        {self._render_anomalies(anomalies)}
        {self._render_recommendations(budget, savings)}
        {self._render_next_steps(next_steps)}
        {self._render_footer()}
    </div>
    <script>
        {self._get_javascript()}
    </script>
</body>
</html>
"""
        return html

    def _render_header(self, data: Dict) -> str:
        """Render dashboard header."""
        account = data["account_type"].title()
        summary = data["summary"]
        date_range = summary.get("date_range", "N/A")

        return f"""
    <header class="header">
        <div class="header-content">
            <h1>💰 Privacy Budget Dashboard</h1>
            <p class="subtitle">{account} Account</p>
            <p class="date-range">Period: {date_range}</p>
        </div>
        <div class="actions">
            <button onclick="window.print()" class="btn btn-secondary">🖨️ Print</button>
            <button onclick="downloadHTML()" class="btn btn-secondary">📥 Download</button>
        </div>
    </header>
"""

    def _render_summary_cards(self, summary: Dict, savings: float, projections: Dict) -> str:
        """Render key metrics cards."""
        total = summary.get("total_spent", 0)
        count = summary.get("transaction_count", 0)

        return f"""
    <section class="metrics-grid">
        <div class="metric-card">
            <div class="metric-icon">💸</div>
            <div class="metric-content">
                <p class="metric-label">Total Spending</p>
                <p class="metric-value">${total:,.2f}</p>
                <p class="metric-detail">{count} transactions</p>
            </div>
        </div>

        <div class="metric-card savings">
            <div class="metric-icon">✨</div>
            <div class="metric-content">
                <p class="metric-label">Savings Potential</p>
                <p class="metric-value">${savings:,.2f}</p>
                <p class="metric-detail">{(savings/total*100):.1f}% reduction</p>
            </div>
        </div>

        <div class="metric-card">
            <div class="metric-icon">📊</div>
            <div class="metric-content">
                <p class="metric-label">Recommended Budget</p>
                <p class="metric-value">${total - savings:,.2f}</p>
                <p class="metric-detail">Monthly goal</p>
            </div>
        </div>

        <div class="metric-card">
            <div class="metric-icon">📈</div>
            <div class="metric-content">
                <p class="metric-label">Annual Projection</p>
                <p class="metric-value">${projections.get('annual', 0):,.2f}</p>
                <p class="metric-detail">At recommended budget</p>
            </div>
        </div>
    </section>
"""

    def _render_charts(self, categories, amounts, colors, merchants, merchant_amounts) -> str:
        """Render interactive charts."""
        categories_json = json.dumps(categories)
        amounts_json = json.dumps(amounts)
        colors_json = json.dumps(colors)
        merchants_json = json.dumps(merchants)
        merchant_amounts_json = json.dumps(merchant_amounts)

        return f"""
    <section class="charts-section">
        <h2>📊 Spending Analysis</h2>

        <div class="charts-grid">
            <div class="chart-container">
                <h3>Spending by Category</h3>
                <canvas id="categoryChart"></canvas>
            </div>

            <div class="chart-container">
                <h3>Top Merchants</h3>
                <canvas id="merchantChart"></canvas>
            </div>
        </div>
    </section>

    <script>
        // Category Pie Chart
        const categoryCtx = document.getElementById('categoryChart').getContext('2d');
        new Chart(categoryCtx, {{
            type: 'doughnut',
            data: {{
                labels: {categories_json},
                datasets: [{{
                    data: {amounts_json},
                    backgroundColor: {colors_json},
                    borderColor: '#fff',
                    borderWidth: 2
                }}]
            }},
            options: {{
                responsive: true,
                plugins: {{
                    legend: {{
                        position: 'bottom',
                        labels: {{
                            padding: 20,
                            font: {{ size: 12 }}
                        }}
                    }},
                    tooltip: {{
                        callbacks: {{
                            label: function(context) {{
                                const label = context.label || '';
                                const value = '$' + context.parsed.toFixed(2);
                                return label + ': ' + value;
                            }}
                        }}
                    }}
                }}
            }}
        }});

        // Top Merchants Bar Chart
        const merchantCtx = document.getElementById('merchantChart').getContext('2d');
        new Chart(merchantCtx, {{
            type: 'bar',
            data: {{
                labels: {merchants_json},
                datasets: [{{
                    label: 'Amount Spent',
                    data: {merchant_amounts_json},
                    backgroundColor: '#6366f1',
                    borderColor: '#4f46e5',
                    borderWidth: 1
                }}]
            }},
            options: {{
                indexAxis: 'y',
                responsive: true,
                plugins: {{
                    legend: {{
                        display: false
                    }},
                    tooltip: {{
                        callbacks: {{
                            label: function(context) {{
                                return '$' + Math.abs(context.parsed.x).toFixed(2);
                            }}
                        }}
                    }}
                }},
                scales: {{
                    x: {{
                        ticks: {{
                            callback: function(value) {{
                                return '$' + value.toFixed(0);
                            }}
                        }}
                    }}
                }}
            }}
        }});
    </script>
"""

    def _render_anomalies(self, anomalies: list) -> str:
        """Render anomalies section."""
        if not anomalies:
            return ""

        rows = ""
        for anom in anomalies[:10]:
            rows += f"""
            <tr>
                <td>{anom.get('date', 'N/A')}</td>
                <td>{anom.get('merchant', 'Unknown')}</td>
                <td class="amount">${anom.get('amount', 0):.2f}</td>
                <td>{anom.get('reason', '')}</td>
            </tr>
"""

        return f"""
    <section class="anomalies-section">
        <h2>⚠️ Anomalies Detected</h2>
        <p class="section-description">These transactions are unusually high or unusual</p>

        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Merchant</th>
                        <th>Amount</th>
                        <th>Reason</th>
                    </tr>
                </thead>
                <tbody>
                    {rows}
                </tbody>
            </table>
        </div>
    </section>
"""

    def _render_recommendations(self, budget: Dict, savings: float) -> str:
        """Render budget recommendations."""
        recommendations = ""
        for category, data in list(budget.items())[:5]:
            potential = data.get("savings_potential", 0)
            if potential > 0:
                current = data.get("current_spend", 0)
                recommended = data.get("recommended_budget", 0)
                recommendations += f"""
            <div class="recommendation-item">
                <div class="rec-header">
                    <h4>{category}</h4>
                    <span class="savings-badge">Save ${potential:.2f}</span>
                </div>
                <p class="rec-detail">{data.get("reasoning", "")}</p>
                <div class="budget-bar">
                    <div class="budget-current" style="width: {(current/(current+500))*100}%">
                        <span class="label">Current: ${current:.2f}</span>
                    </div>
                </div>
                <div class="budget-bar">
                    <div class="budget-recommended" style="width: {(recommended/(recommended+500))*100}%">
                        <span class="label">Recommended: ${recommended:.2f}</span>
                    </div>
                </div>
            </div>
"""

        return f"""
    <section class="recommendations-section">
        <h2>📋 Budget Recommendations</h2>
        <p class="section-description">Categories where you can optimize spending</p>

        <div class="recommendations-list">
            {recommendations}
        </div>

        <div class="savings-summary">
            <p>💰 <strong>Total Savings Potential: ${savings:,.2f}</strong></p>
            <p>This represents the maximum you could save by optimizing spending patterns.</p>
        </div>
    </section>
"""

    def _render_next_steps(self, next_steps: list) -> str:
        """Render action items."""
        steps = ""
        for i, step in enumerate(next_steps[:5], 1):
            steps += f'<li><strong>Step {i}:</strong> {step}</li>\n'

        return f"""
    <section class="action-section">
        <h2>🎯 Recommended Next Steps</h2>
        <ol class="action-list">
            {steps}
        </ol>
    </section>
"""

    def _render_footer(self) -> str:
        """Render footer."""
        return f"""
    <footer class="footer">
        <p>Generated by Privacy Budget MVP on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}</p>
        <p>All data stays private. This report is generated locally and never sent anywhere.</p>
    </footer>
"""

    def _get_css(self) -> str:
        """Return CSS styling."""
        return """
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            line-height: 1.6;
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            overflow: hidden;
        }

        /* Header */
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .header-content h1 {
            font-size: 32px;
            margin-bottom: 10px;
        }

        .subtitle {
            font-size: 18px;
            opacity: 0.9;
        }

        .date-range {
            font-size: 14px;
            opacity: 0.8;
            margin-top: 5px;
        }

        .actions {
            display: flex;
            gap: 10px;
        }

        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s;
        }

        .btn-secondary {
            background: rgba(255, 255, 255, 0.2);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        /* Metrics Grid */
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            padding: 40px;
            background: #f8f9fa;
        }

        .metric-card {
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
            display: flex;
            gap: 15px;
            transition: transform 0.3s;
        }

        .metric-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
        }

        .metric-card.savings {
            border-left: 4px solid #10b981;
        }

        .metric-icon {
            font-size: 32px;
            display: flex;
            align-items: center;
        }

        .metric-content {
            flex: 1;
        }

        .metric-label {
            font-size: 14px;
            color: #666;
            margin-bottom: 5px;
        }

        .metric-value {
            font-size: 24px;
            font-weight: bold;
            color: #667eea;
        }

        .metric-detail {
            font-size: 12px;
            color: #999;
            margin-top: 3px;
        }

        /* Sections */
        section {
            padding: 40px;
            border-top: 1px solid #eee;
        }

        h2 {
            font-size: 24px;
            margin-bottom: 20px;
            color: #333;
        }

        h3 {
            font-size: 16px;
            color: #555;
            margin-bottom: 15px;
        }

        .section-description {
            color: #666;
            font-size: 14px;
            margin-bottom: 20px;
        }

        /* Charts */
        .charts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 30px;
            margin-top: 20px;
        }

        .chart-container {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            position: relative;
            height: 400px;
        }

        /* Tables */
        .table-container {
            overflow-x: auto;
        }

        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }

        .data-table thead {
            background: #f8f9fa;
        }

        .data-table th {
            padding: 12px;
            text-align: left;
            font-weight: 600;
            color: #666;
            border-bottom: 2px solid #eee;
        }

        .data-table td {
            padding: 12px;
            border-bottom: 1px solid #eee;
        }

        .data-table tr:hover {
            background: #f8f9fa;
        }

        .amount {
            color: #667eea;
            font-weight: 600;
        }

        /* Recommendations */
        .recommendations-list {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }

        .recommendation-item {
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            border-radius: 8px;
            padding: 20px;
        }

        .rec-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }

        .rec-header h4 {
            margin: 0;
            color: #333;
        }

        .savings-badge {
            background: #10b981;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }

        .rec-detail {
            color: #666;
            font-size: 13px;
            margin-bottom: 12px;
        }

        .budget-bar {
            background: #e5e7eb;
            border-radius: 4px;
            height: 30px;
            margin-bottom: 8px;
            position: relative;
            overflow: hidden;
        }

        .budget-current {
            background: #fbbf24;
            height: 100%;
            display: flex;
            align-items: center;
            padding: 0 8px;
            color: white;
            font-size: 11px;
            font-weight: 600;
        }

        .budget-recommended {
            background: #10b981;
            height: 100%;
            display: flex;
            align-items: center;
            padding: 0 8px;
            color: white;
            font-size: 11px;
            font-weight: 600;
        }

        .savings-summary {
            background: #ecfdf5;
            border-left: 4px solid #10b981;
            border-radius: 8px;
            padding: 20px;
            margin-top: 20px;
        }

        .savings-summary p {
            margin: 5px 0;
        }

        /* Action Section */
        .action-list {
            margin-left: 20px;
            margin-top: 15px;
        }

        .action-list li {
            margin-bottom: 12px;
            color: #555;
            line-height: 1.6;
        }

        /* Anomalies */
        .anomalies-section {
            background: #fef2f2;
        }

        /* Footer */
        .footer {
            background: #f8f9fa;
            text-align: center;
            color: #999;
            font-size: 12px;
            border-top: 1px solid #eee;
        }

        /* Print Styles */
        @media print {
            body {
                background: white;
                padding: 0;
            }

            .container {
                box-shadow: none;
                border-radius: 0;
            }

            .actions {
                display: none;
            }

            section {
                page-break-inside: avoid;
            }
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
            .header {
                flex-direction: column;
                text-align: center;
            }

            .header-content h1 {
                font-size: 24px;
            }

            .actions {
                margin-top: 15px;
                justify-content: center;
            }

            .metrics-grid {
                grid-template-columns: 1fr;
                padding: 20px;
            }

            .charts-grid {
                grid-template-columns: 1fr;
            }

            .recommendations-list {
                grid-template-columns: 1fr;
            }
        }
"""

    def _get_javascript(self) -> str:
        """Return JavaScript for interactivity."""
        return """
        function downloadHTML() {
            const html = document.documentElement.outerHTML;
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = document.title.replace(/[^a-z0-9]/gi, '_') + '.html';
            a.click();
        }

        // Print-friendly styles
        window.addEventListener('beforeprint', function() {
            document.body.style.background = 'white';
        });

        window.addEventListener('afterprint', function() {
            document.body.style.background = null;
        });
"""

    def _generate_colors(self, count: int) -> list:
        """Generate distinct colors for categories."""
        colors = [
            "#667eea", "#764ba2", "#f093fb", "#4facfe",
            "#43e97b", "#fa709a", "#fee140", "#30b0c8",
            "#ff6b6b", "#4ecdc4", "#45b7d1", "#f9ca24"
        ]
        # Cycle through colors if more categories
        return [colors[i % len(colors)] for i in range(count)]

    def _build_html_template(self) -> str:
        """Build the base HTML template."""
        return ""  # Template is built dynamically in _render_dashboard


# CLI interface
if __name__ == "__main__":
    import sys

    if len(sys.argv) < 3:
        print("Usage: python dashboard_generator.py <analysis.json> <budget.json> [output.html]")
        sys.exit(1)

    analysis_file = sys.argv[1]
    budget_file = sys.argv[2]
    output_file = sys.argv[3] if len(sys.argv) > 3 else None

    generator = DashboardGenerator()
    result = generator.generate(analysis_file, budget_file, output_file=output_file)
    print(f"✓ Dashboard generated: {result}")

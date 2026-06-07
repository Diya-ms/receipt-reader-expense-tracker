"""
File: backend/utils/ml_predictor.py
Linear Regression model for next-month spending prediction.
"""
import numpy as np
from datetime import datetime, timedelta
from collections import defaultdict


def predict_next_month_spending(expenses: list) -> dict:
    """
    Predict next month's spending using Linear Regression
    based on monthly expense history.
    Returns prediction + model metadata.
    """
    if not expenses:
        return {'predicted_amount': 0, 'confidence': 0, 'trend': 'insufficient_data', 'monthly_data': []}

    # Aggregate by month
    monthly = defaultdict(float)
    for exp in expenses:
        date = exp.date if hasattr(exp, 'date') else datetime.fromisoformat(exp.get('date', ''))
        key = date.strftime('%Y-%m')
        monthly[key] += exp.amount if hasattr(exp, 'amount') else exp.get('amount', 0)

    # Sort months
    sorted_months = sorted(monthly.keys())
    if len(sorted_months) < 2:
        avg = list(monthly.values())[0] if monthly else 0
        return {
            'predicted_amount': round(avg, 3),
            'confidence': 30,
            'trend': 'stable',
            'monthly_data': [{'month': m, 'amount': round(monthly[m], 3)} for m in sorted_months]
        }

    # Build X (month index) and y (spending)
    X = np.array(range(len(sorted_months)), dtype=float).reshape(-1, 1)
    y = np.array([monthly[m] for m in sorted_months])

    # Linear Regression: y = mx + b  (closed-form solution)
    X_mean = X.mean()
    y_mean = y.mean()
    numerator = np.sum((X.flatten() - X_mean) * (y - y_mean))
    denominator = np.sum((X.flatten() - X_mean) ** 2)
    slope = numerator / denominator if denominator != 0 else 0
    intercept = y_mean - slope * X_mean

    # Predict next month
    next_idx = len(sorted_months)
    predicted = slope * next_idx + intercept
    predicted = max(predicted, 0)  # No negative spending

    # R-squared for confidence
    y_pred = slope * X.flatten() + intercept
    ss_res = np.sum((y - y_pred) ** 2)
    ss_tot = np.sum((y - y_mean) ** 2)
    r2 = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
    confidence = int(max(0, min(100, r2 * 100)))

    # Determine trend
    if slope > y_mean * 0.05:
        trend = 'increasing'
    elif slope < -y_mean * 0.05:
        trend = 'decreasing'
    else:
        trend = 'stable'

    # Next month label
    last_date = datetime.strptime(sorted_months[-1] + '-01', '%Y-%m-%d')
    next_month = (last_date.replace(day=1) + timedelta(days=32)).replace(day=1)
    next_label = next_month.strftime('%B %Y')

    return {
        'predicted_amount': round(float(predicted), 3),
        'predicted_month': next_label,
        'confidence': confidence,
        'trend': trend,
        'slope': round(float(slope), 3),
        'monthly_data': [{'month': m, 'amount': round(monthly[m], 3)} for m in sorted_months],
        'average_monthly': round(float(y_mean), 3),
    }


def get_category_predictions(expenses: list) -> list:
    """Predict next month spending per category."""
    from collections import defaultdict

    cat_expenses = defaultdict(list)
    for exp in expenses:
        cat = exp.category if hasattr(exp, 'category') else exp.get('category', 'Others')
        cat_expenses[cat].append(exp)

    predictions = []
    for cat, cat_exps in cat_expenses.items():
        pred = predict_next_month_spending(cat_exps)
        if pred['predicted_amount'] > 0:
            predictions.append({
                'category': cat,
                'predicted_amount': pred['predicted_amount'],
                'trend': pred['trend']
            })

    return sorted(predictions, key=lambda x: x['predicted_amount'], reverse=True)


def get_budget_suggestions(expenses: list) -> list:
    """Generate budget suggestions based on spending patterns."""
    if not expenses:
        return []

    from collections import defaultdict
    cat_total = defaultdict(float)
    for exp in expenses:
        cat = exp.category if hasattr(exp, 'category') else exp.get('category', 'Others')
        cat_total[cat] += exp.amount if hasattr(exp, 'amount') else exp.get('amount', 0)

    total = sum(cat_total.values())
    suggestions = []

    benchmarks = {
        'Food & Dining': 0.15,
        'Groceries': 0.12,
        'Transportation': 0.10,
        'Shopping': 0.10,
        'Entertainment': 0.05,
        'Utilities': 0.08,
        'Healthcare': 0.05,
        'Education': 0.05,
    }

    for cat, spent in cat_total.items():
        pct = spent / total if total else 0
        bench = benchmarks.get(cat, 0.08)
        if pct > bench * 1.5:
            suggestions.append({
                'category': cat,
                'type': 'warning',
                'message': f'Your {cat} spending is {pct*100:.0f}% of total. Consider a budget of {bench*100:.0f}%.',
                'current_pct': round(pct * 100, 1),
                'suggested_pct': round(bench * 100, 1)
            })
        elif pct > bench * 1.2:
            suggestions.append({
                'category': cat,
                'type': 'info',
                'message': f'{cat} is slightly over benchmark ({pct*100:.0f}% vs {bench*100:.0f}%).',
                'current_pct': round(pct * 100, 1),
                'suggested_pct': round(bench * 100, 1)
            })

    return suggestions

"""
File: backend/routes/insights.py
AI insights: spending predictions, budget suggestions, summaries.
"""
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from models.expense import Expense
from utils.ml_predictor import predict_next_month_spending, get_category_predictions, get_budget_suggestions

insights_bp = Blueprint('insights', __name__)


def _get_user_id():
    return int(get_jwt_identity())


@insights_bp.route('/prediction', methods=['GET'])
@jwt_required()
def spending_prediction():
    uid = _get_user_id()
    expenses = Expense.query.filter_by(user_id=uid).order_by(Expense.date.asc()).all()
    prediction = predict_next_month_spending(expenses)
    return jsonify(prediction), 200


@insights_bp.route('/category-predictions', methods=['GET'])
@jwt_required()
def category_predictions():
    uid = _get_user_id()
    expenses = Expense.query.filter_by(user_id=uid).all()
    predictions = get_category_predictions(expenses)
    return jsonify(predictions), 200


@insights_bp.route('/budget-suggestions', methods=['GET'])
@jwt_required()
def budget_suggestions():
    uid = _get_user_id()
    expenses = Expense.query.filter_by(user_id=uid).all()
    suggestions = get_budget_suggestions(expenses)
    return jsonify(suggestions), 200


@insights_bp.route('/summary', methods=['GET'])
@jwt_required()
def full_summary():
    uid = _get_user_id()
    expenses = Expense.query.filter_by(user_id=uid).all()

    if not expenses:
        return jsonify({'message': 'No expenses yet'}), 200

    from collections import defaultdict
    cat_total = defaultdict(float)
    for e in expenses:
        cat_total[e.category] += e.amount

    top_cat = max(cat_total, key=cat_total.get) if cat_total else 'N/A'
    total = sum(e.amount for e in expenses)
    avg_per_expense = total / len(expenses) if expenses else 0

    prediction = predict_next_month_spending(expenses)
    suggestions = get_budget_suggestions(expenses)

    return jsonify({
        'top_spending_category': top_cat,
        'top_spending_amount': round(cat_total[top_cat], 3),
        'total_all_time': round(total, 3),
        'average_per_expense': round(avg_per_expense, 3),
        'total_receipts': len(expenses),
        'category_breakdown': [{'category': k, 'total': round(v, 3)} for k, v in
                                sorted(cat_total.items(), key=lambda x: x[1], reverse=True)],
        'next_month_prediction': prediction,
        'budget_suggestions': suggestions,
    }), 200

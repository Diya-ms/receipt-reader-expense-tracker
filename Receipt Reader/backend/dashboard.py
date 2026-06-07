"""
File: backend/dashboard.py
Dashboard analytics: totals, category breakdown, trends.
"""
from datetime import datetime, timedelta
from collections import defaultdict
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func

from database import db
from expense import Expense

dashboard_bp = Blueprint('dashboard', __name__)


def _get_user_id():
    return int(get_jwt_identity())


@dashboard_bp.route('/summary', methods=['GET'])
@jwt_required()
def summary():
    uid = _get_user_id()
    now = datetime.utcnow()

    # Date windows
    week_start = now - timedelta(days=7)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    year_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)

    def total_in_range(start):
        result = db.session.query(func.sum(Expense.amount)).filter(
            Expense.user_id == uid,
            Expense.date >= start
        ).scalar()
        return round(float(result or 0), 3)

    all_total = db.session.query(func.sum(Expense.amount)).filter(
        Expense.user_id == uid
    ).scalar()

    count = Expense.query.filter_by(user_id=uid).count()

    return jsonify({
        'total_all_time': round(float(all_total or 0), 3),
        'total_this_week': total_in_range(week_start),
        'total_this_month': total_in_range(month_start),
        'total_this_year': total_in_range(year_start),
        'total_expenses_count': count,
    }), 200


@dashboard_bp.route('/by-category', methods=['GET'])
@jwt_required()
def by_category():
    uid = _get_user_id()
    days = request.args.get('days', 30, type=int)
    since = datetime.utcnow() - timedelta(days=days)

    rows = db.session.query(
        Expense.category,
        func.sum(Expense.amount).label('total'),
        func.count(Expense.id).label('count')
    ).filter(
        Expense.user_id == uid,
        Expense.date >= since
    ).group_by(Expense.category).all()

    return jsonify([{
        'category': r.category,
        'total': round(float(r.total), 3),
        'count': r.count
    } for r in rows]), 200


@dashboard_bp.route('/monthly-trend', methods=['GET'])
@jwt_required()
def monthly_trend():
    uid = _get_user_id()
    months = request.args.get('months', 12, type=int)
    since = datetime.utcnow() - timedelta(days=months * 31)

    expenses = Expense.query.filter(
        Expense.user_id == uid,
        Expense.date >= since
    ).all()

    monthly = defaultdict(float)
    for exp in expenses:
        key = exp.date.strftime('%Y-%m')
        monthly[key] += exp.amount

    # Fill missing months
    result = []
    for i in range(months - 1, -1, -1):
        d = datetime.utcnow() - timedelta(days=i * 31)
        key = d.strftime('%Y-%m')
        label = d.strftime('%b %Y')
        result.append({'month': key, 'label': label, 'total': round(monthly.get(key, 0), 3)})

    return jsonify(result), 200


@dashboard_bp.route('/recent-expenses', methods=['GET'])
@jwt_required()
def recent_expenses():
    uid = _get_user_id()
    limit = request.args.get('limit', 10, type=int)
    exps = Expense.query.filter_by(user_id=uid).order_by(Expense.date.desc()).limit(limit).all()
    return jsonify([e.to_dict() for e in exps]), 200


@dashboard_bp.route('/weekly-trend', methods=['GET'])
@jwt_required()
def weekly_trend():
    uid = _get_user_id()
    since = datetime.utcnow() - timedelta(days=84)  # 12 weeks

    expenses = Expense.query.filter(
        Expense.user_id == uid,
        Expense.date >= since
    ).all()

    weekly = defaultdict(float)
    for exp in expenses:
        week = exp.date.strftime('%Y-W%W')
        weekly[week] += exp.amount

    result = []
    for i in range(11, -1, -1):
        d = datetime.utcnow() - timedelta(weeks=i)
        key = d.strftime('%Y-W%W')
        result.append({'week': key, 'label': f'W{d.strftime("%W")}', 'total': round(weekly.get(key, 0), 3)})

    return jsonify(result), 200

"""
File: backend/expenses.py
Full CRUD operations for expenses with search & filter.
"""
import json
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import and_, or_

from database import db
from expense import Expense

expenses_bp = Blueprint('expenses', __name__)


def _get_user_id():
    return int(get_jwt_identity())


@expenses_bp.route('/', methods=['GET'])
@jwt_required()
def list_expenses():
    uid = _get_user_id()
    q = Expense.query.filter_by(user_id=uid)

    # Filters
    category = request.args.get('category')
    merchant = request.args.get('merchant')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    min_amount = request.args.get('min_amount', type=float)
    max_amount = request.args.get('max_amount', type=float)
    search = request.args.get('search')
    sort_by = request.args.get('sort_by', 'date')
    sort_dir = request.args.get('sort_dir', 'desc')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    if category:
        q = q.filter(Expense.category == category)
    if merchant:
        q = q.filter(Expense.merchant_name.ilike(f'%{merchant}%'))
    if date_from:
        q = q.filter(Expense.date >= datetime.fromisoformat(date_from))
    if date_to:
        q = q.filter(Expense.date <= datetime.fromisoformat(date_to))
    if min_amount is not None:
        q = q.filter(Expense.amount >= min_amount)
    if max_amount is not None:
        q = q.filter(Expense.amount <= max_amount)
    if search:
        q = q.filter(or_(
            Expense.merchant_name.ilike(f'%{search}%'),
            Expense.notes.ilike(f'%{search}%')
        ))

    # Sorting
    col = getattr(Expense, sort_by, Expense.date)
    q = q.order_by(col.desc() if sort_dir == 'desc' else col.asc())

    paginated = q.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        'expenses': [e.to_dict() for e in paginated.items],
        'total': paginated.total,
        'pages': paginated.pages,
        'page': page,
        'per_page': per_page
    }), 200


@expenses_bp.route('/', methods=['POST'])
@jwt_required()
def create_expense():
    uid = _get_user_id()
    data = request.get_json()

    date_val = datetime.fromisoformat(data['date']) if data.get('date') else datetime.utcnow()
    exp = Expense(
        user_id=uid,
        merchant_name=data.get('merchant_name', 'Unknown'),
        date=date_val,
        category=data.get('category', 'Others'),
        amount=float(data.get('amount', 0)),
        currency=data.get('currency', 'KWD'),
        tax_amount=float(data.get('tax_amount', 0)),
        items=json.dumps(data.get('items', [])),
        receipt_path=data.get('receipt_path'),
        notes=data.get('notes', '')
    )
    db.session.add(exp)
    db.session.commit()
    return jsonify(exp.to_dict()), 201


@expenses_bp.route('/<int:expense_id>', methods=['GET'])
@jwt_required()
def get_expense(expense_id):
    uid = _get_user_id()
    exp = Expense.query.filter_by(id=expense_id, user_id=uid).first_or_404()
    return jsonify(exp.to_dict()), 200


@expenses_bp.route('/<int:expense_id>', methods=['PUT'])
@jwt_required()
def update_expense(expense_id):
    uid = _get_user_id()
    exp = Expense.query.filter_by(id=expense_id, user_id=uid).first_or_404()
    data = request.get_json()

    if 'merchant_name' in data:
        exp.merchant_name = data['merchant_name']
    if 'date' in data:
        exp.date = datetime.fromisoformat(data['date'])
    if 'category' in data:
        exp.category = data['category']
    if 'amount' in data:
        exp.amount = float(data['amount'])
    if 'tax_amount' in data:
        exp.tax_amount = float(data['tax_amount'])
    if 'currency' in data:
        exp.currency = data['currency']
    if 'items' in data:
        exp.items = json.dumps(data['items'])
    if 'notes' in data:
        exp.notes = data['notes']
    if 'receipt_path' in data:
        exp.receipt_path = data['receipt_path']

    db.session.commit()
    return jsonify(exp.to_dict()), 200


@expenses_bp.route('/<int:expense_id>', methods=['DELETE'])
@jwt_required()
def delete_expense(expense_id):
    uid = _get_user_id()
    exp = Expense.query.filter_by(id=expense_id, user_id=uid).first_or_404()
    db.session.delete(exp)
    db.session.commit()
    return jsonify({'message': 'Deleted'}), 200


@expenses_bp.route('/bulk-delete', methods=['POST'])
@jwt_required()
def bulk_delete():
    uid = _get_user_id()
    ids = request.get_json().get('ids', [])
    Expense.query.filter(Expense.id.in_(ids), Expense.user_id == uid).delete(synchronize_session=False)
    db.session.commit()
    return jsonify({'deleted': len(ids)}), 200

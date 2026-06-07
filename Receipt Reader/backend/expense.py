"""
File: backend/models/expense.py
"""
from datetime import datetime
from models.database import db


class Expense(db.Model):
    __tablename__ = 'expenses'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    merchant_name = db.Column(db.String(200), nullable=False)
    date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    category = db.Column(db.String(100), nullable=False, default='Others')
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(10), default='KWD')
    tax_amount = db.Column(db.Float, default=0.0)
    items = db.Column(db.Text, default='[]')        # JSON string of line items
    receipt_path = db.Column(db.String(500))
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        import json
        try:
            items = json.loads(self.items) if self.items else []
        except Exception:
            items = []
        return {
            'id': self.id,
            'user_id': self.user_id,
            'merchant_name': self.merchant_name,
            'date': self.date.isoformat() if self.date else None,
            'category': self.category,
            'amount': round(self.amount, 3),
            'currency': self.currency,
            'tax_amount': round(self.tax_amount or 0, 3),
            'items': items,
            'receipt_path': self.receipt_path,
            'notes': self.notes,
            'created_at': self.created_at.isoformat()
        }

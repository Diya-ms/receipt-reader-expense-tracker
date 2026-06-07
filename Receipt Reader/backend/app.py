"""
Receipt Reader & Expense Tracker - Main Flask Application
File: backend/app.py
"""
import os
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv

from database import db
from auth import auth_bp
from receipts import receipts_bp
from expenses import expenses_bp
from dashboard import dashboard_bp
from export import export_bp
from insights import insights_bp

load_dotenv()

def create_app():
    app = Flask(__name__)

    # Configuration
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-prod')
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-change-in-prod')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///receipt_tracker.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), 'uploads')
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max

    # Ensure upload folder exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # Initialize extensions
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)
    db.init_app(app)
    JWTManager(app)

    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(receipts_bp, url_prefix='/api/receipts')
    app.register_blueprint(expenses_bp, url_prefix='/api/expenses')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(export_bp, url_prefix='/api/export')
    app.register_blueprint(insights_bp, url_prefix='/api/insights')

    # Create all tables
    with app.app_context():
        db.create_all()
        _seed_sample_data(app)

    return app


def _seed_sample_data(app):
    """Seed sample data if DB is empty."""
    from user import User
    from expense import Expense
    from datetime import datetime, timedelta
    import random

    if User.query.first():
        return  # Already seeded

    # Create demo user
    demo = User(username='demo', email='demo@example.com')
    demo.set_password('demo123')
    db.session.add(demo)
    db.session.flush()

    categories = ['Food & Dining', 'Groceries', 'Transportation', 'Shopping',
                  'Entertainment', 'Utilities', 'Healthcare']
    merchants = {
        'Food & Dining': ['McDonald\'s', 'Starbucks', 'Pizza Hut', 'KFC', 'Subway'],
        'Groceries': ['Lulu Hypermarket', 'Carrefour', 'Sultan Center', 'Co-op'],
        'Transportation': ['Uber', 'Careem', 'KPTC', 'Shell Gas', 'Q8 Fuel'],
        'Shopping': ['H&M', 'Zara', 'Amazon', 'The Avenues Mall', 'Ikea'],
        'Entertainment': ['Netflix', 'VOX Cinemas', 'Grand Cinemas', 'Steam'],
        'Utilities': ['MEW', 'Zain', 'Ooredoo', 'STC', 'Viva'],
        'Healthcare': ['Royale Hayat', 'Al Salam Hospital', 'Boots Pharmacy'],
    }

    base = datetime.now() - timedelta(days=180)
    for i in range(120):
        cat = random.choice(categories)
        merchant = random.choice(merchants[cat])
        amount = round(random.uniform(2.5, 250.0), 3)
        date = base + timedelta(days=random.randint(0, 180))
        exp = Expense(
            user_id=demo.id,
            merchant_name=merchant,
            date=date,
            category=cat,
            amount=amount,
            currency='KWD',
            notes=f'Sample expense at {merchant}',
            receipt_path=None
        )
        db.session.add(exp)

    db.session.commit()
    print("✅ Sample data seeded successfully")


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)

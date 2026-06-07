"""
File: backend/routes/receipts.py
Receipt upload and OCR extraction endpoints.
"""
import os
import uuid
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename

from utils.ocr import extract_text_from_file, parse_receipt_text, categorize_expense

receipts_bp = Blueprint('receipts', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@receipts_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_receipt():
    """Upload and OCR a receipt file."""
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if not file or file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    if not allowed_file(file.filename):
        return jsonify({'error': 'File type not allowed. Use PNG, JPG, or PDF.'}), 400

    user_id = get_jwt_identity()
    filename = f"{user_id}_{uuid.uuid4().hex}_{secure_filename(file.filename)}"
    upload_folder = current_app.config['UPLOAD_FOLDER']
    file_path = os.path.join(upload_folder, filename)
    file.save(file_path)

    # Run OCR
    try:
        raw_text = extract_text_from_file(file_path)
        parsed = parse_receipt_text(raw_text)
        parsed['receipt_path'] = filename
        parsed['category'] = categorize_expense(
            parsed.get('merchant_name', ''),
            parsed.get('items', []),
            raw_text
        )
    except Exception as e:
        return jsonify({'error': f'OCR processing failed: {str(e)}'}), 500

    return jsonify(parsed), 200


@receipts_bp.route('/uploads/<filename>')
@jwt_required()
def get_receipt_image(filename):
    """Serve receipt image file."""
    upload_folder = current_app.config['UPLOAD_FOLDER']
    return send_from_directory(upload_folder, filename)

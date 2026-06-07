"""
File: backend/utils/ocr.py
OCR utilities using Tesseract (with fallback to mock data).
"""
import re
import os
import json
from datetime import datetime

# Try importing OCR libraries; fall back gracefully
try:
    import pytesseract
    from PIL import Image
    import pdf2image
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False

# Try EasyOCR as secondary option
try:
    import easyocr
    EASYOCR_AVAILABLE = True
    _easyocr_reader = None
except ImportError:
    EASYOCR_AVAILABLE = False


def get_easyocr_reader():
    global _easyocr_reader
    if _easyocr_reader is None:
        _easyocr_reader = easyocr.Reader(['en'], gpu=False)
    return _easyocr_reader


def extract_text_from_file(file_path: str) -> str:
    """Extract raw text from image or PDF file."""
    ext = os.path.splitext(file_path)[1].lower()

    if ext == '.pdf':
        return _extract_text_from_pdf(file_path)
    else:
        return _extract_text_from_image(file_path)


def _extract_text_from_image(file_path: str) -> str:
    if OCR_AVAILABLE:
        try:
            img = Image.open(file_path)
            # Preprocess for better OCR
            img = img.convert('L')  # Grayscale
            text = pytesseract.image_to_string(img, config='--psm 6')
            return text
        except Exception as e:
            print(f"Tesseract error: {e}")

    if EASYOCR_AVAILABLE:
        try:
            reader = get_easyocr_reader()
            results = reader.readtext(file_path, detail=0)
            return '\n'.join(results)
        except Exception as e:
            print(f"EasyOCR error: {e}")

    # Return mock text for demo/testing
    return _get_mock_receipt_text()


def _extract_text_from_pdf(file_path: str) -> str:
    if OCR_AVAILABLE:
        try:
            images = pdf2image.convert_from_path(file_path, dpi=200)
            texts = []
            for img in images:
                img = img.convert('L')
                texts.append(pytesseract.image_to_string(img, config='--psm 6'))
            return '\n'.join(texts)
        except Exception as e:
            print(f"PDF OCR error: {e}")

    return _get_mock_receipt_text()


def _get_mock_receipt_text() -> str:
    """Return mock receipt text for demo purposes."""
    return """
    LULU HYPERMARKET
    Al Rai Branch, Kuwait
    Tel: +965 2222-3333

    Date: 15/06/2024  Time: 14:32
    Receipt No: 0045829

    ITEMS:
    Milk 1L x2             1.200 KWD
    Bread Whole Wheat       0.750 KWD
    Chicken Breast 1kg      2.850 KWD
    Olive Oil 500ml         3.200 KWD
    Yogurt 500g             0.900 KWD
    Eggs 12pcs              1.500 KWD
    Orange Juice 1L         1.100 KWD
    Tomatoes 1kg            0.650 KWD

    Subtotal:              12.150 KWD
    Tax (0%):               0.000 KWD
    TOTAL:                 12.150 KWD

    Thank you for shopping with us!
    """


def parse_receipt_text(text: str) -> dict:
    """Parse raw OCR text into structured receipt data."""
    lines = [l.strip() for l in text.strip().splitlines() if l.strip()]

    result = {
        'merchant_name': '',
        'date': '',
        'time': '',
        'items': [],
        'subtotal': 0.0,
        'tax_amount': 0.0,
        'total_amount': 0.0,
        'raw_text': text
    }

    # --- Merchant name: first non-empty line ---
    if lines:
        result['merchant_name'] = lines[0]

    # --- Date extraction ---
    date_patterns = [
        r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
        r'(\d{4}[/-]\d{1,2}[/-]\d{1,2})',
        r'(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})',
    ]
    for pat in date_patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            result['date'] = m.group(1)
            break

    # --- Time extraction ---
    time_m = re.search(r'(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?)', text, re.IGNORECASE)
    if time_m:
        result['time'] = time_m.group(1)

    # --- Total, subtotal, tax ---
    total_patterns = [
        (r'(?:total|grand\s*total)[:\s]+([0-9]+[.,][0-9]{2,3})', 'total_amount'),
        (r'(?:subtotal|sub\s*total)[:\s]+([0-9]+[.,][0-9]{2,3})', 'subtotal'),
        (r'(?:tax|vat|gst)[:\s]+([0-9]+[.,][0-9]{2,3})', 'tax_amount'),
    ]
    for pat, key in total_patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            try:
                result[key] = float(m.group(1).replace(',', '.'))
            except ValueError:
                pass

    # If total not found, try largest amount
    if result['total_amount'] == 0.0:
        amounts = re.findall(r'([0-9]+\.[0-9]{2,3})', text)
        floats = [float(a) for a in amounts]
        if floats:
            result['total_amount'] = max(floats)

    # --- Item extraction ---
    item_pattern = re.compile(
        r'^(.+?)\s+x?\s*(\d+)?\s+([0-9]+[.,][0-9]{2,3})\s*(?:KWD|USD|EUR|GBP)?',
        re.IGNORECASE
    )
    skip_keywords = {'total', 'subtotal', 'tax', 'vat', 'cash', 'change', 'receipt',
                     'thank', 'date', 'time', 'tel', 'phone', 'branch', 'no.', '#'}

    for line in lines[1:]:
        lower = line.lower()
        if any(kw in lower for kw in skip_keywords):
            continue
        m = item_pattern.match(line)
        if m:
            name = m.group(1).strip()
            qty = int(m.group(2)) if m.group(2) else 1
            price = float(m.group(3).replace(',', '.'))
            if name and price > 0:
                result['items'].append({
                    'name': name,
                    'quantity': qty,
                    'price': price,
                    'total': round(qty * price, 3)
                })

    return result


def categorize_expense(merchant_name: str, items: list = None, text: str = '') -> str:
    """Keyword-based expense categorization."""
    combined = f"{merchant_name} {text} {' '.join(i.get('name','') for i in (items or []))}".lower()

    rules = [
        ('Food & Dining', ['restaurant', 'cafe', 'coffee', 'starbucks', 'mcdonald', 'kfc', 'pizza',
                           'burger', 'sushi', 'dining', 'grill', 'kitchen', 'eatery', 'bistro',
                           'subway', 'domino', 'wings', 'shawarma', 'falafel']),
        ('Groceries', ['supermarket', 'hypermarket', 'grocery', 'lulu', 'carrefour', 'sultan',
                       'co-op', 'market', 'fresh', 'vegetable', 'fruit', 'bakery', 'deli']),
        ('Transportation', ['uber', 'careem', 'taxi', 'fuel', 'gas', 'petrol', 'shell', 'q8',
                            'airline', 'flight', 'bus', 'train', 'metro', 'parking', 'kptc']),
        ('Shopping', ['amazon', 'mall', 'h&m', 'zara', 'ikea', 'clothing', 'shoes', 'fashion',
                      'electronics', 'apple', 'samsung', 'noon', 'namshi', 'boutique']),
        ('Entertainment', ['netflix', 'cinema', 'movie', 'vox', 'grand cinemas', 'steam',
                           'spotify', 'gaming', 'theatre', 'concert', 'event', 'fun']),
        ('Utilities', ['electricity', 'water', 'mew', 'telecom', 'zain', 'ooredoo', 'stc',
                       'viva', 'internet', 'phone bill', 'subscription', 'insurance']),
        ('Healthcare', ['hospital', 'clinic', 'pharmacy', 'medicine', 'doctor', 'dental',
                        'optical', 'health', 'boots', 'watson', 'lab', 'medical']),
        ('Education', ['school', 'university', 'college', 'course', 'book', 'stationery',
                       'library', 'training', 'tuition', 'education']),
    ]

    for category, keywords in rules:
        if any(kw in combined for kw in keywords):
            return category

    return 'Others'

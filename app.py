import os
import re
import logging
from datetime import datetime, timezone
from flask import Flask, render_template, request, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
# safe_str_cmp was removed in newer Werkzeug versions, not needed for our use case
from functools import wraps
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Security configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-change-in-production')
app.config['SESSION_COOKIE_SECURE'] = os.getenv('FLASK_ENV') == 'production'
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

# Security headers middleware
@app.after_request
def add_security_headers(response):
    """Add security headers to all responses"""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.googleapis.com; img-src 'self' data:; font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com;"
    return response

# CORS configuration
CORS(app, origins=os.getenv('ALLOWED_ORIGINS', 'http://localhost:8080').split(','))

# Database configuration
import os.path
db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'instance', 'rep_contacts.db')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', f'sqlite:///{db_path}')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Rate limiting
from collections import defaultdict
import time

request_counts = defaultdict(list)
RATE_LIMIT_REQUESTS = 100  # requests per window
RATE_LIMIT_WINDOW = 3600   # 1 hour window

def rate_limit(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        client_ip = request.remote_addr
        now = time.time()
        
        # Clean old requests
        request_counts[client_ip] = [req_time for req_time in request_counts[client_ip] 
                                   if now - req_time < RATE_LIMIT_WINDOW]
        
        # Check rate limit
        if len(request_counts[client_ip]) >= RATE_LIMIT_REQUESTS:
            return jsonify({'error': 'Rate limit exceeded'}), 429
        
        # Add current request
        request_counts[client_ip].append(now)
        
        return f(*args, **kwargs)
    return decorated_function

# Input validation functions
def validate_zip_code(zip_code):
    """Validate US zip code format"""
    if not zip_code:
        return False, "Zip code is required"
    
    zip_code = str(zip_code).strip()
    # US zip code pattern: 5 digits or 5+4 format
    pattern = r'^\d{5}(-\d{4})?$'
    if not re.match(pattern, zip_code):
        return False, "Invalid zip code format. Use 5 digits (e.g., 12345) or 5+4 format (e.g., 12345-6789)"
    
    return True, zip_code

def validate_phone_number(phone):
    """Validate and format phone number"""
    if not phone:
        return False, "Phone number is required"
    
    # Remove all non-digit characters
    digits = re.sub(r'\D', '', str(phone))
    
    if len(digits) == 10:
        return True, f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
    elif len(digits) == 11 and digits[0] == '1':
        return True, f"({digits[1:4]}) {digits[4:7]}-{digits[7:]}"
    else:
        return False, "Invalid phone number format. Use 10 digits (e.g., 1234567890) or 11 digits starting with 1"

def validate_name(name):
    """Validate representative name"""
    if not name or not name.strip():
        return False, "Name is required"
    
    name = name.strip()
    if len(name) < 2:
        return False, "Name must be at least 2 characters long"
    
    if len(name) > 100:
        return False, "Name must be less than 100 characters"
    
    # Allow letters, spaces, hyphens, apostrophes, and periods
    if not re.match(r'^[A-Za-z\s\-\'\.]+$', name):
        return False, "Name contains invalid characters"
    
    return True, name

def sanitize_input(text):
    """Sanitize user input to prevent XSS"""
    if not text:
        return ""
    
    # Remove potentially dangerous HTML/script tags
    text = re.sub(r'<[^>]*>', '', str(text))
    # Remove null bytes and other control characters
    text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', text)
    return text.strip()

# API Keys from environment variables
CONGRESS_API_KEY = os.getenv('CONGRESS_API_KEY')
GOOGLE_CIVIC_API_KEY = os.getenv('GOOGLE_CIVIC_API_KEY')
OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')

# OpenRouter API Configuration - DeepSeek V3 (FREE TIER ONLY)
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
DEEPSEEK_FREE_MODEL = "deepseek/deepseek-chat-v3-0324:free"

app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///rep_contacts.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['TEMPLATES_AUTO_RELOAD'] = True
app.jinja_env.cache = {}

# Reduce logging verbosity
import logging
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

# Database Models
class Representative(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    zip_code = db.Column(db.String(10), nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    position = db.Column(db.String(100), nullable=False)  # e.g., "Senator", "Representative"
    custom_position = db.Column(db.String(100), nullable=True)  # For "Other" positions
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    deleted_at = db.Column(db.DateTime, nullable=True)  # Soft delete
    
    # Relationship to phone numbers
    phone_numbers = db.relationship('RepresentativePhone', backref='representative', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'zip_code': self.zip_code,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': f"{self.first_name} {self.last_name}",
            'position': self.position,
            'custom_position': self.custom_position,
            'display_position': self.custom_position if self.custom_position else self.position,
            'phone_numbers': [phone.to_dict() for phone in self.phone_numbers if not phone.deleted_at],
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class RepresentativePhone(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    representative_id = db.Column(db.Integer, db.ForeignKey('representative.id'), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    extension = db.Column(db.String(10), nullable=True)
    phone_type = db.Column(db.String(50), nullable=False, default='Main')  # e.g., "DC Office", "District Office"
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    deleted_at = db.Column(db.DateTime, nullable=True)  # Soft delete
    
    def to_dict(self):
        return {
            'id': self.id,
            'phone': self.phone,
            'extension': self.extension,
            'phone_type': self.phone_type,
            'display_phone': f"{self.phone}{f' ext. {self.extension}' if self.extension else ''}",
            'phone_link': f"{self.phone}{f',{self.extension}' if self.extension else ''}",
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class RepresentativeSuggestion(db.Model):
    """Suggestion database for API-sourced representative data"""
    id = db.Column(db.Integer, primary_key=True)
    zip_code = db.Column(db.String(10), nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    position = db.Column(db.String(100), nullable=False)
    state = db.Column(db.String(50), nullable=False)
    district = db.Column(db.String(50), nullable=True)
    source = db.Column(db.String(50), nullable=False)  # 'congress_gov', 'google_civic', etc.
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationship to phone numbers
    phone_numbers = db.relationship('RepresentativeSuggestionPhone', backref='representative_suggestion', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'zip_code': self.zip_code,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': f"{self.first_name} {self.last_name}",
            'position': self.position,
            'state': self.state,
            'district': self.district,
            'source': self.source,
            'phone_numbers': [phone.to_dict() for phone in self.phone_numbers],
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class RepresentativeSuggestionPhone(db.Model):
    """Phone numbers for suggestion database"""
    id = db.Column(db.Integer, primary_key=True)
    representative_suggestion_id = db.Column(db.Integer, db.ForeignKey('representative_suggestion.id'), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    extension = db.Column(db.String(10), nullable=True)
    phone_type = db.Column(db.String(50), nullable=False, default='Main')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    def to_dict(self):
        return {
            'id': self.id,
            'phone': self.phone,
            'extension': self.extension,
            'phone_type': self.phone_type,
            'display_phone': f"{self.phone}{f' ext. {self.extension}' if self.extension else ''}",
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class CallScript(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'content': self.content,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class CallLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    # User identification (for future multi-user support)
    user_id = db.Column(db.String(100), nullable=False, default='default_user')
    
    # Call details
    representative_name = db.Column(db.String(200), nullable=False)
    phone_number = db.Column(db.String(50), nullable=False)
    phone_type = db.Column(db.String(50), nullable=False)
    
    # Call outcome
    call_datetime = db.Column(db.DateTime, nullable=False)
    call_outcome = db.Column(db.String(50), nullable=False)  # 'person', 'voicemail', 'failed'
    call_notes = db.Column(db.Text)
    
    # Script used
    script_id = db.Column(db.Integer, db.ForeignKey('call_script.id'))
    script_title = db.Column(db.String(200))
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    session_id = db.Column(db.String(100))  # To group calls from same session
    is_test_data = db.Column(db.Boolean, default=False)  # Flag for test/dummy data
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'representative_name': self.representative_name,
            'phone_number': self.phone_number,
            'phone_type': self.phone_type,
            'call_datetime': self.call_datetime.isoformat(),
            'call_outcome': self.call_outcome,
            'call_notes': self.call_notes,
            'script_id': self.script_id,
            'script_title': self.script_title,
            'created_at': self.created_at.isoformat(),
            'session_id': self.session_id,
            'is_test_data': self.is_test_data
        }

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/health')
def health_check():
    """Health check endpoint for monitoring"""
    try:
        # Test database connection
        from sqlalchemy import text
        db.session.execute(text('SELECT 1'))
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'version': '1.0.0',
            'build_date': '2024-01-15'
        }), 200
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 500

@app.route('/version')
def version():
    """Version information endpoint"""
    return jsonify({
        'version': '1.0.0',
        'name': 'CallRep',
        'description': 'Contact Your Representatives - Production Ready',
        'build_date': '2024-01-15'
    })

@app.route('/api/representatives/<zip_code>')
@rate_limit
def get_representatives(zip_code):
    """Get representatives from the production database (human-validated only)"""
    # Validate zip code
    is_valid, result = validate_zip_code(zip_code)
    if not is_valid:
        return jsonify({'error': result}), 400
    
    try:
        reps = Representative.query.filter_by(zip_code=result, deleted_at=None).all()
        logger.info(f"Retrieved {len(reps)} representatives for zip code {result}")
        return jsonify([rep.to_dict() for rep in reps])
    except Exception as e:
        logger.error(f"Error retrieving representatives for zip {result}: {e}")
        return jsonify({'error': 'Error retrieving representatives'}), 500

@app.route('/api/representatives/<zip_code>/suggestions', methods=['POST'])
@rate_limit
def get_representative_suggestions(zip_code):
    """
    Get suggested representatives from the suggestion database for a zip code.
    These are API-sourced suggestions that users can review and accept.
    """
    # Validate zip code
    is_valid, result = validate_zip_code(zip_code)
    if not is_valid:
        return jsonify({'error': result}), 400
    
    try:
        # Check if representatives already exist for this zip code in production DB
        existing_reps = Representative.query.filter_by(zip_code=result, deleted_at=None).all()
        if existing_reps:
            return jsonify({'error': 'Representatives already exist for this zip code'}), 400
        
        # Get suggestions from suggestion database
        suggestions = RepresentativeSuggestion.query.filter_by(zip_code=result).all()
        
        if suggestions:
            logger.info(f"Found {len(suggestions)} suggestions for zip code {result}")
            return jsonify({
                'success': True,
                'suggested_representatives': [suggestion.to_dict() for suggestion in suggestions],
                'message': f'Found {len(suggestions)} suggested representatives for your area'
            })
        else:
            logger.info(f"No suggestions found for zip code {result}")
            return jsonify({
                'success': False,
                'message': 'No suggestions available for this zip code. Please add representatives manually.'
            })
            
    except Exception as e:
        logger.error(f"Error getting suggestions for zip {result}: {e}")
        return jsonify({'error': 'Error getting suggestions'}), 500

@app.route('/api/representatives/<zip_code>/accept-suggestions', methods=['POST'])
@rate_limit
def accept_suggested_representatives(zip_code):
    """
    Accept suggested representatives and add them to the production database.
    """
    # Validate zip code
    is_valid, result = validate_zip_code(zip_code)
    if not is_valid:
        return jsonify({'error': result}), 400
    
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        accepted_suggestion_ids = data.get('suggestion_ids', [])
        
        if not accepted_suggestion_ids:
            return jsonify({'error': 'No suggestions selected'}), 400
        
        # Validate suggestion IDs are integers
        try:
            accepted_suggestion_ids = [int(sid) for sid in accepted_suggestion_ids]
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid suggestion IDs'}), 400
        
        added_reps = []
        skipped_reps = []
        
        for suggestion_id in accepted_suggestion_ids:
            suggestion = RepresentativeSuggestion.query.get(suggestion_id)
            if suggestion and suggestion.zip_code == result:
                # Check if this specific representative already exists
                existing_rep = Representative.query.filter_by(
                    zip_code=result,
                    first_name=suggestion.first_name,
                    last_name=suggestion.last_name,
                    position=suggestion.position,
                    deleted_at=None
                ).first()
                
                if existing_rep:
                    # Representative already exists, skip it
                    skipped_reps.append(f"{suggestion.first_name} {suggestion.last_name}")
                    continue
                
                # Create representative in production database
                new_rep = Representative(
                    zip_code=result,
                    first_name=suggestion.first_name,
                    last_name=suggestion.last_name,
                    position=suggestion.position,
                    custom_position=None
                )
                db.session.add(new_rep)
                db.session.flush()  # Get the ID
                
                # Add phone numbers
                for phone_suggestion in suggestion.phone_numbers:
                    phone_obj = RepresentativePhone(
                        representative_id=new_rep.id,
                        phone=phone_suggestion.phone,
                        extension=phone_suggestion.extension,
                        phone_type=phone_suggestion.phone_type
                    )
                    db.session.add(phone_obj)
                
                added_reps.append(new_rep.to_dict())
        
        db.session.commit()
        logger.info(f"Added {len(added_reps)} representatives for zip {result}, skipped {len(skipped_reps)}")
        
        message = f'Successfully added {len(added_reps)} representatives'
        if skipped_reps:
            message += f'. Skipped {len(skipped_reps)} already existing: {", ".join(skipped_reps)}'
        
        return jsonify({
            'success': True,
            'message': message,
            'representatives': added_reps
        })
        
    except Exception as e:
        logger.error(f"Error accepting suggestions for zip {result}: {e}")
        db.session.rollback()
        return jsonify({'error': 'Error adding representatives'}), 500

@app.route('/api/representatives', methods=['POST'])
@rate_limit
def add_representative():
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate zip code
        zip_code = data.get('zip_code', '')
        is_valid, zip_result = validate_zip_code(zip_code)
        if not is_valid:
            return jsonify({'error': zip_result}), 400
        
        # Validate and parse name
        full_name = sanitize_input(data.get('name', data.get('representative_name', '')))
        is_valid, name_result = validate_name(full_name)
        if not is_valid:
            return jsonify({'error': name_result}), 400
        
        name_parts = name_result.split()
        if len(name_parts) >= 2:
            first_name = name_parts[0]
            last_name = ' '.join(name_parts[1:])
        else:
            first_name = name_result
            last_name = ''
        
        # Validate position
        position = sanitize_input(data.get('position', ''))
        if not position or position not in ['Senator', 'Representative', 'Other']:
            return jsonify({'error': 'Invalid position. Must be Senator, Representative, or Other'}), 400
        
        custom_position = None
        if position == 'Other':
            custom_position = sanitize_input(data.get('custom_position', ''))
            if not custom_position:
                return jsonify({'error': 'Custom position is required when position is Other'}), 400
        
        # Create representative
        new_rep = Representative(
            zip_code=zip_result,
            first_name=first_name,
            last_name=last_name,
            position=position,
            custom_position=custom_position
        )
        db.session.add(new_rep)
        db.session.flush()  # Get the ID
        
        # Add phone numbers
        phone_data = data.get('phones', [])
        if not phone_data:
            # Backward compatibility - single phone
            phone = data.get('phone', '')
            extension = sanitize_input(data.get('extension', ''))
            phone_type = sanitize_input(data.get('phone_type', 'Main'))
            
            if phone:
                is_valid, phone_result = validate_phone_number(phone)
                if not is_valid:
                    return jsonify({'error': phone_result}), 400
                
                phone_obj = RepresentativePhone(
                    representative_id=new_rep.id,
                    phone=phone_result,
                    extension=extension,
                    phone_type=phone_type
                )
                db.session.add(phone_obj)
        else:
            # Multiple phones
            for phone_info in phone_data:
                phone = phone_info.get('phone', '')
                extension = sanitize_input(phone_info.get('extension', ''))
                phone_type = sanitize_input(phone_info.get('phone_type', 'Main'))
                
                if phone:
                    is_valid, phone_result = validate_phone_number(phone)
                    if not is_valid:
                        return jsonify({'error': phone_result}), 400
                    
                    phone_obj = RepresentativePhone(
                        representative_id=new_rep.id,
                        phone=phone_result,
                        extension=extension,
                        phone_type=phone_type
                    )
                    db.session.add(phone_obj)
        
        db.session.commit()
        logger.info(f"Added representative {first_name} {last_name} for zip {zip_result}")
        return jsonify({'success': True, 'representative': new_rep.to_dict()}), 201
        
    except Exception as e:
        logger.error(f"Error adding representative: {e}")
        db.session.rollback()
        return jsonify({'error': 'Error adding representative'}), 500

@app.route('/api/representatives/<int:rep_id>', methods=['DELETE'])
def delete_representative(rep_id):
    rep = Representative.query.get_or_404(rep_id)
    rep.deleted_at = datetime.now(timezone.utc)
    db.session.commit()
    return '', 204

@app.route('/api/representatives/<int:rep_id>/phones', methods=['POST'])
def add_phone_to_representative(rep_id):
    rep = Representative.query.filter_by(id=rep_id, deleted_at=None).first_or_404()
    data = request.json
    
    # Sanitize phone number
    phone = data['phone']
    phone_digits = ''.join(filter(str.isdigit, phone))
    if len(phone_digits) == 10:
        phone = f"({phone_digits[:3]}) {phone_digits[3:6]}-{phone_digits[6:]}"
    elif len(phone_digits) == 11 and phone_digits[0] == '1':
        phone = f"({phone_digits[1:4]}) {phone_digits[4:7]}-{phone_digits[7:]}"
    else:
        phone = phone_digits if phone_digits else phone
    
    phone_obj = RepresentativePhone(
        representative_id=rep_id,
        phone=phone,
        extension=data.get('extension', ''),
        phone_type=data.get('phone_type', 'Main')
    )
    db.session.add(phone_obj)
    db.session.commit()
    return jsonify(phone_obj.to_dict()), 201

@app.route('/api/representatives/<int:rep_id>/phones/<int:phone_id>', methods=['DELETE'])
def delete_phone_number(rep_id, phone_id):
    phone = RepresentativePhone.query.filter_by(id=phone_id, representative_id=rep_id, deleted_at=None).first_or_404()
    phone.deleted_at = datetime.now(timezone.utc)
    db.session.commit()
    return '', 204

@app.route('/api/scripts')
def get_scripts():
    try:
        scripts = CallScript.query.order_by(CallScript.created_at.desc()).all()
        return jsonify([script.to_dict() for script in scripts])
    except Exception as e:
        logger.error(f"Error getting scripts: {e}")
        return jsonify({'error': 'Error retrieving scripts'}), 500

@app.route('/api/scripts', methods=['POST'])
def add_script():
    data = request.json
    new_script = CallScript(
        title=data['title'],
        content=data['content']
    )
    db.session.add(new_script)
    db.session.commit()
    return jsonify(new_script.to_dict()), 201

@app.route('/api/scripts/<int:script_id>', methods=['GET'])
def get_script(script_id):
    script = CallScript.query.get_or_404(script_id)
    return jsonify(script.to_dict())

@app.route('/api/scripts/<int:script_id>', methods=['PUT'])
def update_script(script_id):
    script = CallScript.query.get_or_404(script_id)
    data = request.get_json()
    
    script.title = data.get('title', script.title)
    script.content = data.get('content', script.content)
    script.updated_at = datetime.now(timezone.utc)
    
    db.session.commit()
    return jsonify({'success': True, 'script': script.to_dict()})

@app.route('/api/scripts/<int:script_id>', methods=['DELETE'])
def delete_script(script_id):
    script = CallScript.query.get_or_404(script_id)
    db.session.delete(script)
    db.session.commit()
    return '', 204

@app.route('/api/generate-script', methods=['POST'])
def generate_script():
    try:
        data = request.get_json()
        user_notes = data.get('notes', '')
        
        if not user_notes.strip():
            return jsonify({'error': 'Please provide some notes about what you want to discuss'}), 400
        
        # Check if we're running locally (for development/demo)
        is_localhost = request.headers.get('Host', '').startswith('localhost') or request.headers.get('Host', '').startswith('127.0.0.1')
        
        if is_localhost:
            # Local development - use actual AI generation
            try:
                generated_result = generate_ai_script(user_notes)
                return jsonify({
                    'script': generated_result['content'],
                    'title': generated_result['title'],
                    'success': True,
                    'note': 'Generated using DeepSeek V3 (FREE TIER) via OpenRouter',
                    'mode': 'local'
                })
            except Exception as e:
                logger.warning(f"AI generation failed, using external tool approach: {str(e)}")
                # Use external AI tool approach (same as production) when API fails
                prompt_text = f"""You are a helpful assistant that creates phone call scripts for constituents calling their representatives.

User input: {user_notes}

Please create a professional, polite, and effective phone call script that:
1. Is conversational and natural-sounding
2. Clearly states the issue/concern based on the user's input
3. Makes a specific request or asks for action
4. Is respectful and appreciative
5. Does NOT solicit input from the representative (they are there to listen and take notes)
6. Is 5-10 sentences long, depending on how much detail the user provided

IMPORTANT: Always start the script with: "Hi, I'd like to register an opinion. My name is __ and I'm a constituent from @ZipCode."

You can use these reference parameters in your script:
- @RepType: Will be replaced with "Representative" or "Senator"
- @LastName: Will be replaced with the representative's last name
- @ZipCode: Will be replaced with the constituent's zip code

Example: "I'm calling @RepType @LastName from @ZipCode to express my concern about..."

Write only the script content, no additional formatting or explanations."""
                
                return jsonify({
                    'prompt': prompt_text,
                    'user_notes': user_notes,
                    'success': True,
                    'mode': 'external',
                    'note': 'AI service unavailable - use external AI tool (copy prompt to ChatGPT)'
                })
        else:
            # Production - provide external tool guidance
            prompt_text = f"""You are a helpful assistant that creates phone call scripts for constituents calling their representatives.

User input: {user_notes}

Please create a professional, polite, and effective phone call script that:
1. Is conversational and natural-sounding
2. Clearly states the issue/concern based on the user's input
3. Makes a specific request or asks for action
4. Is respectful and appreciative
5. Does NOT solicit input from the representative (they are there to listen and take notes)
6. Is 5-10 sentences long, depending on how much detail the user provided

IMPORTANT: Always start the script with: "Hi, I'd like to register an opinion. My name is __ and I'm a constituent from @ZipCode."

You can use these reference parameters in your script:
- @RepType: Will be replaced with "Representative" or "Senator"
- @LastName: Will be replaced with the representative's last name
- @ZipCode: Will be replaced with the constituent's zip code

Example: "I'm calling @RepType @LastName from @ZipCode to express my concern about..."

Write only the script content, no additional formatting or explanations."""
            
            return jsonify({
                'prompt': prompt_text,
                'user_notes': user_notes,
                'success': True,
                'mode': 'external',
                'note': 'Use external AI tool - copy the prompt below and paste into ChatGPT or similar'
            })
        
    except Exception as e:
        return jsonify({'error': f'Request failed: {str(e)}'}), 500

def generate_ai_script(notes):
    """Generate a script using OpenRouter API with DeepSeek V3 (FREE TIER ONLY)"""
    
    if OPENROUTER_API_KEY == 'your-openrouter-api-key-here' or OPENROUTER_API_KEY == 'invalid-key-for-testing':
        raise Exception("OpenRouter API key not configured")
    
    prompt = f"""You are a helpful assistant that creates phone call scripts for constituents calling their representatives.

User input: {notes}

Please create a professional, polite, and effective phone call script that:
1. Is conversational and natural-sounding
2. Clearly states the issue/concern based on the user's input
3. Makes a specific request or asks for action
4. Is respectful
5. Does NOT solicit input from the representative (they are there to listen and take notes)
6. Is 5-10 sentences long, depending on how much detail the user provided

IMPORTANT: Always start the script with: "Hi, I'd like to register an opinion. My name is __ and I'm a constituent from @ZipCode."

IMPORTANT: Always end the script with: "Thank you and have a great day."

You can use these reference parameters in your script:
- @RepType: Will be replaced with "Representative" or "Senator"
- @LastName: Will be replaced with the representative's last name
- @ZipCode: Will be replaced with the constituent's zip code

Example: "I'm calling @RepType @LastName from @ZipCode to express my concern about..."

Do not be overly thankful for the representative's public service. Keep the tone professional and direct.

Write only the script content, no additional formatting or explanations."""

    headers = {
        'Authorization': f'Bearer {OPENROUTER_API_KEY}',
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:8080',
        'X-Title': 'Contact Your Representatives App'
    }
    
    data = {
        'model': DEEPSEEK_FREE_MODEL,
        'messages': [
            {
                'role': 'user',
                'content': prompt
            }
        ],
        'max_tokens': 300,
        'temperature': 0.7
    }
    
    try:
        response = requests.post(
            f'{OPENROUTER_BASE_URL}/chat/completions',
            headers=headers,
            json=data,
            timeout=30
        )
        
        if response.status_code != 200:
            raise Exception(f"OpenRouter API error: {response.status_code} - {response.text}")
        
        result = response.json()
        
        # Check if the response has the expected structure
        if 'choices' not in result or not result['choices']:
            raise Exception("API response missing 'choices' field")
        
        if 'message' not in result['choices'][0] or 'content' not in result['choices'][0]['message']:
            raise Exception("API response missing 'message' or 'content' field")
        
        script_content = result['choices'][0]['message']['content'].strip()
        
        # Generate a title based on the user's input
        title_prompt = f"""Based on this user input: "{notes}"

Generate a brief, professional title for a phone call script (3-8 words). The title should capture the main topic or issue.

Write only the title, no additional text."""
        
        title_data = {
            'model': DEEPSEEK_FREE_MODEL,
            'messages': [
                {
                    'role': 'user',
                    'content': title_prompt
                }
            ],
            'max_tokens': 50,
            'temperature': 0.7
        }
        
        title_response = requests.post(
            f'{OPENROUTER_BASE_URL}/chat/completions',
            headers=headers,
            json=title_data,
            timeout=30
        )
        
        if title_response.status_code == 200:
            title_result = title_response.json()
            if 'choices' in title_result and title_result['choices'] and 'message' in title_result['choices'][0] and 'content' in title_result['choices'][0]['message']:
                script_title = title_result['choices'][0]['message']['content'].strip()
            else:
                script_title = f"Script about {notes[:30]}..."
        else:
            # Fallback title if API fails
            script_title = f"Script about {notes[:30]}..."
        
        return {
            'title': script_title,
            'content': script_content
        }
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Request exception: {e}")
        raise Exception(f"Network error: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise

def generate_fallback_script(notes):
    """Generate a sophisticated script locally using AI-like logic"""
    import random
    
    # Enhanced templates with more variety
    templates = [
        "Hello, I'm calling as a concerned constituent about {topic}. I believe it's important that {reasoning}. I would appreciate if you could {action}. Thank you for your time and consideration.",
        "Hi, I'm reaching out regarding {topic}. As your constituent, I feel strongly that {reasoning}. I hope you will {action}. I appreciate you taking the time to listen to my concerns.",
        "Good day, I'm calling about {topic}. This issue matters to me because {reasoning}. I'm asking you to {action}. Thank you for your attention to this matter.",
        "Hello, I'm a constituent calling about {topic}. I want to express my concern that {reasoning}. I'm urging you to {action}. Thank you for your service and consideration.",
        "Hi there, I'm calling as a concerned voter about {topic}. I believe {reasoning}. I'm requesting that you {action}. I appreciate your time and look forward to your response."
    ]
    
    # Enhanced keyword detection
    topic_keywords = {
        'climate change': ['climate', 'environment', 'global warming', 'carbon', 'renewable', 'green energy'],
        'healthcare': ['healthcare', 'health care', 'medical', 'insurance', 'medicare', 'medicaid', 'affordable care'],
        'education': ['education', 'school', 'student', 'teacher', 'college', 'university', 'funding'],
        'economy': ['economy', 'economic', 'jobs', 'employment', 'business', 'tax', 'financial'],
        'immigration': ['immigration', 'immigrant', 'border', 'citizenship', 'visa', 'asylum'],
        'gun control': ['gun', 'firearm', 'weapon', 'safety', 'background check', 'second amendment'],
        'infrastructure': ['infrastructure', 'roads', 'bridges', 'transportation', 'construction', 'public works'],
        'social security': ['social security', 'retirement', 'senior', 'elderly', 'pension'],
        'veterans': ['veteran', 'military', 'service member', 'armed forces', 'veterans affairs'],
        'civil rights': ['civil rights', 'equality', 'discrimination', 'justice', 'fairness', 'rights']
    }
    
    action_keywords = {
        'support legislation': ['support', 'vote for', 'back', 'endorse', 'champion'],
        'oppose legislation': ['oppose', 'vote against', 'reject', 'block', 'prevent'],
        'consider this issue': ['consider', 'look into', 'examine', 'review', 'study'],
        'take action': ['take action', 'act', 'do something', 'address', 'tackle'],
        'fund this program': ['fund', 'allocate', 'budget', 'invest in', 'support funding'],
        'investigate this': ['investigate', 'look into', 'examine', 'probe', 'study']
    }
    
    reasoning_templates = [
        "this affects our community directly",
        "this is crucial for our future",
        "this impacts many of your constituents",
        "this is a matter of public safety and well-being",
        "this is essential for our economic growth",
        "this is important for social justice",
        "this affects the most vulnerable among us",
        "this is critical for environmental protection"
    ]
    
    # Detect topic from notes
    notes_lower = notes.lower()
    detected_topic = 'this important issue'
    
    for topic, keywords in topic_keywords.items():
        if any(keyword in notes_lower for keyword in keywords):
            detected_topic = topic
            break
    
    # Detect action from notes
    detected_action = 'consider my position on this matter'
    
    for action, keywords in action_keywords.items():
        if any(keyword in notes_lower for keyword in keywords):
            detected_action = action
            break
    
    # Select reasoning
    selected_reasoning = random.choice(reasoning_templates)
    
    # Customize reasoning based on topic
    if 'climate' in detected_topic or 'environment' in detected_topic:
        selected_reasoning = "this is crucial for protecting our environment and future generations"
    elif 'healthcare' in detected_topic:
        selected_reasoning = "this directly impacts the health and well-being of our community"
    elif 'education' in detected_topic:
        selected_reasoning = "this is essential for our children's future and community development"
    elif 'economy' in detected_topic:
        selected_reasoning = "this affects our local economy and job opportunities"
    
    # Select and format template
    template = random.choice(templates)
    script_content = template.format(
        topic=detected_topic,
        reasoning=selected_reasoning,
        action=detected_action
    )
    
    # Add the standard opening line that AI scripts use
    full_script = f"Hi, I'd like to register an opinion. My name is __ and I'm a constituent from @ZipCode.\n\n{script_content}"
    
    return full_script

@app.route('/api/call-logs', methods=['POST'])
def create_call_log():
    data = request.get_json()
    
    # Parse datetime
    call_datetime = datetime.fromisoformat(data['call_datetime'].replace('Z', '+00:00'))
    
    call_log = CallLog(
        user_id=data.get('user_id', 'default_user'),
        representative_name=data['representative_name'],
        phone_number=data['phone_number'],
        phone_type=data['phone_type'],
        call_datetime=call_datetime,
        call_outcome=data['call_outcome'],
        call_notes=data.get('call_notes', ''),
        script_id=data.get('script_id'),
        script_title=data.get('script_title', ''),
        session_id=data.get('session_id', ''),
        is_test_data=data.get('is_test_data', False)
    )
    
    db.session.add(call_log)
    db.session.commit()
    
    return jsonify({'success': True, 'call_log': call_log.to_dict()})

@app.route('/api/call-logs', methods=['GET'])
def get_call_logs():
    # Get query parameters for filtering
    user_id = request.args.get('user_id', 'default_user')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    outcome = request.args.get('outcome')
    include_test_data = request.args.get('include_test_data', 'true').lower() == 'true'
    
    query = CallLog.query.filter_by(user_id=user_id)
    
    if start_date:
        start_datetime = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        query = query.filter(CallLog.call_datetime >= start_datetime)
    
    if end_date:
        end_datetime = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        query = query.filter(CallLog.call_datetime <= end_datetime)
    
    if outcome:
        query = query.filter(CallLog.call_outcome == outcome)
    
    # Filter out test data unless explicitly requested
    if not include_test_data:
        query = query.filter(CallLog.is_test_data == False)
    
    # Order by most recent first
    call_logs = query.order_by(CallLog.call_datetime.desc()).all()
    
    return jsonify({
        'success': True,
        'call_logs': [log.to_dict() for log in call_logs]
    })

@app.route('/api/call-logs/stats')
def get_call_stats():
    """Get call statistics"""
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    user_id = request.args.get('user_id', 'default_user')
    include_test_data = request.args.get('include_test_data', 'true').lower() == 'true'
    
    query = CallLog.query.filter(CallLog.user_id == user_id)
    
    if start_date:
        query = query.filter(CallLog.call_datetime >= datetime.fromisoformat(start_date.replace('Z', '+00:00')))
    if end_date:
        query = query.filter(CallLog.call_datetime <= datetime.fromisoformat(end_date.replace('Z', '+00:00')))
    
    # Filter out test data unless explicitly requested
    if not include_test_data:
        query = query.filter(CallLog.is_test_data == False)
    
    call_logs = query.all()
    
    # Calculate statistics
    total_calls = len(call_logs)
    calls_by_outcome = {}
    calls_by_date = {}
    calls_by_rep = {}
    calls_by_script = {}
    
    for log in call_logs:
        # Outcome stats
        outcome = log.call_outcome
        calls_by_outcome[outcome] = calls_by_outcome.get(outcome, 0) + 1
        
        # Date stats
        date_str = log.call_datetime.strftime('%Y-%m-%d')
        calls_by_date[date_str] = calls_by_date.get(date_str, 0) + 1
        
        # Representative stats
        rep_name = log.representative_name
        calls_by_rep[rep_name] = calls_by_rep.get(rep_name, 0) + 1
        
        # Script stats
        script_title = log.script_title
        if script_title:
            calls_by_script[script_title] = calls_by_script.get(script_title, 0) + 1
    
    return jsonify({
        'total_calls': total_calls,
        'calls_by_outcome': calls_by_outcome,
        'calls_by_date': calls_by_date,
        'calls_by_rep': calls_by_rep,
        'calls_by_script': calls_by_script
    })

@app.route('/api/clear-database', methods=['POST'])
def clear_database():
    """
    Clear all representative data except for zip code 94102.
    This removes auto-populated data that was added without user approval.
    """
    try:
        # Delete all representatives except those with zip code 94102
        representatives_to_delete = Representative.query.filter(
            Representative.zip_code != '94102',
            Representative.deleted_at.is_(None)
        ).all()
        
        deleted_count = 0
        for rep in representatives_to_delete:
            rep.deleted_at = datetime.now(timezone.utc)
            deleted_count += 1
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Successfully cleared {deleted_count} representatives from database',
            'deleted_count': deleted_count
        })
        
    except Exception as e:
        logger.error(f"Error clearing database: {e}")
        db.session.rollback()
        return jsonify({'error': 'Error clearing database'}), 500

# Initialize database with some sample data
def init_db():
    with app.app_context():
        # Create all tables
        db.create_all()
        
        # Check if we already have data
        if Representative.query.first() is None:
            # Add sample representatives for 94102 (San Francisco)
            nancy_pelosi = Representative(
                zip_code='94102',
                first_name='Nancy',
                last_name='Pelosi',
                position='Representative',
                custom_position=None
            )
            db.session.add(nancy_pelosi)
            db.session.flush()
            
            # Add phone numbers for Nancy Pelosi
            pelosi_dc_phone = RepresentativePhone(
                representative_id=nancy_pelosi.id,
                phone='(202) 225-4965',
                extension='1',
                phone_type='DC Office'
            )
            pelosi_district_phone = RepresentativePhone(
                representative_id=nancy_pelosi.id,
                phone='(415) 556-4862',
                extension='5',
                phone_type='District Office'
            )
            db.session.add(pelosi_dc_phone)
            db.session.add(pelosi_district_phone)
            
            # Add Alex Padilla (Senator)
            alex_padilla = Representative(
                zip_code='94102',
                first_name='Alex',
                last_name='Padilla',
                position='Senator',
                custom_position=None
            )
            db.session.add(alex_padilla)
            db.session.flush()
            
            # Add phone numbers for Alex Padilla
            padilla_dc_phone = RepresentativePhone(
                representative_id=alex_padilla.id,
                phone='(202) 224-3553',
                extension='2',
                phone_type='DC Office'
            )
            padilla_district_phone = RepresentativePhone(
                representative_id=alex_padilla.id,
                phone='(415) 981-9369',
                extension='',
                phone_type='District Office'
            )
            db.session.add(padilla_dc_phone)
            db.session.add(padilla_district_phone)
            
            # Add Adam Schiff (Senator)
            adam_schiff = Representative(
                zip_code='94102',
                first_name='Adam',
                last_name='Schiff',
                position='Senator',
                custom_position=None
            )
            db.session.add(adam_schiff)
            db.session.flush()
            
            # Add phone numbers for Adam Schiff
            schiff_dc_phone = RepresentativePhone(
                representative_id=adam_schiff.id,
                phone='(202) 224-3841',
                extension='1',
                phone_type='DC Office'
            )
            schiff_district_phone = RepresentativePhone(
                representative_id=adam_schiff.id,
                phone='(310) 914-7300',
                extension='',
                phone_type='District Office'
            )
            db.session.add(schiff_dc_phone)
            db.session.add(schiff_district_phone)
            
            db.session.commit()
            logger.info("Added sample representatives for 94102")
        
        # Initialize call scripts if they don't exist
        if CallScript.query.first() is None:
            scripts = [
                CallScript(
                    title="General Support",
                    content="Hello, I'm calling to express my support for [issue/topic]. I believe this is important for our community and I hope you'll consider supporting it. Thank you for your time."
                ),
                CallScript(
                    title="Opposition",
                    content="Hello, I'm calling to express my opposition to [issue/topic]. I have concerns about how this might affect our community and I hope you'll reconsider your position. Thank you for listening."
                ),
                CallScript(
                    title="Request Information",
                    content="Hello, I'm calling to request more information about [issue/topic]. I'd like to understand your position and what you're doing to address this issue. Thank you for your time."
                ),
                CallScript(
                    title="Thank You",
                    content="Hello, I'm calling to thank you for your work on [issue/topic]. I appreciate your efforts and wanted to let you know that your constituents are paying attention. Keep up the good work!"
                ),
                CallScript(
                    title="Custom Issue",
                    content="Hello, I'm calling about [describe your issue]. This is important to me because [explain why]. I hope you'll consider [what you want them to do]. Thank you for your time and consideration."
                )
            ]
            
            for script in scripts:
                db.session.add(script)
            
            db.session.commit()
            logger.info("Added sample call scripts")

if __name__ == '__main__':
    # Production configuration
    port = int(os.getenv('PORT', 8080))
    debug = os.getenv('FLASK_ENV') == 'development'
    
    with app.app_context():
        try:
            db.create_all()
            init_db()
        except Exception as e:
            logger.warning(f"Database initialization warning: {e}")
            # Continue anyway - tables might already exist
    
    logger.info(f"Starting CallRep app on port {port} (debug={debug})")
    app.run(host='0.0.0.0', port=port, debug=debug) 
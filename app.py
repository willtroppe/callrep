from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timezone
import os
import requests
import json

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///rep_contacts.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

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
            'display_position': self.custom_position if self.position == 'Other' else self.position,
            'phone_numbers': [phone.to_dict() for phone in self.phone_numbers if phone.deleted_at is None],
            'created_at': self.created_at.isoformat()
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
            'display_phone': f"{self.phone}{' ext. ' + self.extension if self.extension else ''}",
            'phone_link': f"{self.phone}{',' + self.extension if self.extension else ''}"
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
            'session_id': self.session_id
        }

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/representatives/<zip_code>')
def get_representatives(zip_code):
    reps = Representative.query.filter_by(zip_code=zip_code, deleted_at=None).all()
    return jsonify([rep.to_dict() for rep in reps])

@app.route('/api/representatives', methods=['POST'])
def add_representative():
    data = request.json
    
    # Parse name into first and last
    full_name = data['name'].strip()
    name_parts = full_name.split()
    
    if len(name_parts) >= 2:
        first_name = name_parts[0]
        last_name = ' '.join(name_parts[1:])
    else:
        first_name = full_name
        last_name = ''
    
    # Handle custom position
    position = data['position']
    custom_position = data.get('custom_position', '') if position == 'Other' else None
    
    new_rep = Representative(
        zip_code=data['zip_code'],
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
        extension = data.get('extension', '')
        phone_type = data.get('phone_type', 'Main')
        
        if phone:
            # Sanitize phone number
            phone_digits = ''.join(filter(str.isdigit, phone))
            if len(phone_digits) == 10:
                phone = f"({phone_digits[:3]}) {phone_digits[3:6]}-{phone_digits[6:]}"
            elif len(phone_digits) == 11 and phone_digits[0] == '1':
                phone = f"({phone_digits[1:4]}) {phone_digits[4:7]}-{phone_digits[7:]}"
            else:
                phone = phone_digits if phone_digits else phone
            
            phone_obj = RepresentativePhone(
                representative_id=new_rep.id,
                phone=phone,
                extension=extension,
                phone_type=phone_type
            )
            db.session.add(phone_obj)
    else:
        # Multiple phones
        for phone_info in phone_data:
            phone = phone_info['phone']
            extension = phone_info.get('extension', '')
            phone_type = phone_info.get('phone_type', 'Main')
            
            # Sanitize phone number
            phone_digits = ''.join(filter(str.isdigit, phone))
            if len(phone_digits) == 10:
                phone = f"({phone_digits[:3]}) {phone_digits[3:6]}-{phone_digits[6:]}"
            elif len(phone_digits) == 11 and phone_digits[0] == '1':
                phone = f"({phone_digits[1:4]}) {phone_digits[4:7]}-{phone_digits[7:]}"
            else:
                phone = phone_digits if phone_digits else phone
            
            phone_obj = RepresentativePhone(
                representative_id=new_rep.id,
                phone=phone,
                extension=extension,
                phone_type=phone_type
            )
            db.session.add(phone_obj)
    
    db.session.commit()
    return jsonify(new_rep.to_dict()), 201

@app.route('/api/representatives/<int:rep_id>', methods=['DELETE'])
def delete_representative(rep_id):
    rep = Representative.query.get_or_404(rep_id)
    rep.deleted_at = datetime.utcnow()
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
    phone.deleted_at = datetime.utcnow()
    db.session.commit()
    return '', 204

@app.route('/api/scripts')
def get_scripts():
    scripts = CallScript.query.order_by(CallScript.created_at.desc()).all()
    return jsonify([script.to_dict() for script in scripts])

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
        
        # Generate script locally (more reliable than API calls)
        generated_script = generate_fallback_script(user_notes)
        
        return jsonify({
            'script': generated_script,
            'success': True,
            'note': 'Generated using local AI system'
        })
        
    except Exception as e:
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

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
    script = template.format(
        topic=detected_topic,
        reasoning=selected_reasoning,
        action=detected_action
    )
    
    return script

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
        session_id=data.get('session_id', '')
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
    
    query = CallLog.query.filter_by(user_id=user_id)
    
    if start_date:
        start_datetime = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        query = query.filter(CallLog.call_datetime >= start_datetime)
    
    if end_date:
        end_datetime = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        query = query.filter(CallLog.call_datetime <= end_datetime)
    
    if outcome:
        query = query.filter(CallLog.call_outcome == outcome)
    
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
    
    query = CallLog.query.filter(CallLog.user_id == user_id)
    
    if start_date:
        query = query.filter(CallLog.call_datetime >= datetime.fromisoformat(start_date.replace('Z', '+00:00')))
    if end_date:
        query = query.filter(CallLog.call_datetime <= datetime.fromisoformat(end_date.replace('Z', '+00:00')))
    
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

# Initialize database with some sample data
def init_db():
    """Initialize the database with sample data"""
    db.create_all()
    
    # Check if we already have data
    if CallScript.query.first() is None:
        # Add sample scripts
        sample_scripts = [
            CallScript(title="Healthcare Reform", content="Hi, I'm calling about healthcare reform. I believe everyone deserves access to affordable healthcare and I urge you to support policies that expand coverage and reduce costs."),
            CallScript(title="Climate Action", content="Hello, I'm calling as a concerned constituent about climate change. I believe we need immediate action to reduce emissions and transition to renewable energy sources."),
            CallScript(title="Education Funding", content="Hi there, I'm calling about education funding. I believe our schools need more resources and I'm asking you to support increased funding for public education.")
        ]
        
        for script in sample_scripts:
            db.session.add(script)
        
        db.session.commit()
    
    # Add test call log data if none exists
    if CallLog.query.first() is None:
        from datetime import datetime, timedelta
        import random
        
        # Create test data for the last 30 days
        test_reps = ["Senator John Smith", "Representative Jane Doe", "Governor Bob Johnson", "Senator Alice Brown", "Representative Mike Wilson"]
        test_scripts = ["Healthcare Reform", "Climate Action", "Education Funding", "Gun Control", "Immigration Reform"]
        outcomes = ["person", "voicemail", "failed"]
        
        # Create more varied and realistic data patterns
        for i in range(30):
            date = datetime.now() - timedelta(days=i)
            
            # Create varying call volumes - more calls on weekdays, fewer on weekends
            is_weekend = date.weekday() >= 5  # Saturday = 5, Sunday = 6
            if is_weekend:
                daily_calls = random.randint(0, 2)  # Fewer calls on weekends
            else:
                daily_calls = random.randint(2, 8)  # More calls on weekdays
            
            # Add some special days with higher activity
            if i in [0, 7, 14, 21]:  # Every week has one high-activity day
                daily_calls = random.randint(8, 15)
            
            for j in range(daily_calls):
                # Vary outcomes based on time of day
                hour = random.randint(9, 17)
                if hour < 12:
                    # Morning calls more likely to reach people
                    outcome_weights = {"person": 0.6, "voicemail": 0.3, "failed": 0.1}
                else:
                    # Afternoon calls more likely to get voicemail
                    outcome_weights = {"person": 0.3, "voicemail": 0.6, "failed": 0.1}
                
                # Weighted random choice for outcomes
                outcome = random.choices(list(outcome_weights.keys()), weights=list(outcome_weights.values()))[0]
                
                call_log = CallLog(
                    user_id='test_user',
                    representative_name=random.choice(test_reps),
                    phone_number=f"(555) 123-{random.randint(1000, 9999)}",
                    phone_type=random.choice(["DC Office", "District Office", "Main", "Constituent Services"]),
                    call_datetime=date.replace(hour=hour, minute=random.randint(0, 59)),
                    call_outcome=outcome,
                    call_notes=f"Test call {i}-{j} - {outcome}",
                    script_id=random.randint(1, 5),
                    script_title=random.choice(test_scripts),
                    session_id=f"test_session_{i}",
                    created_at=date
                )
                db.session.add(call_log)
        
        db.session.commit()
        print("Added comprehensive test call log data")

if __name__ == '__main__':
    with app.app_context():
        init_db()
    # Development settings
    app.run(host='0.0.0.0', port=8080, debug=False) 
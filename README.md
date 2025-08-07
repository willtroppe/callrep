# CallRep v1.0 🏛️

**Contact Your Representatives - Production Ready**

A modern web application that helps citizens find and contact their political representatives with AI-powered call scripts and comprehensive call tracking.

## ✨ Features

### 🎯 Core Functionality
- **Representative Lookup**: Find your senators and representatives by zip code
- **Auto-Population**: Intelligent suggestions from official government APIs
- **Call Scripts**: AI-generated personalized call scripts
- **Call Tracking**: Log and analyze your call outcomes
- **Analytics Dashboard**: Track your civic engagement over time

### 🛡️ Security & Reliability
- **Input Validation**: Comprehensive validation for all user inputs
- **Rate Limiting**: Protection against abuse (100 requests/hour per IP)
- **XSS Prevention**: Input sanitization and secure output
- **SQL Injection Protection**: ORM-based database queries
- **CORS Configuration**: Secure cross-origin resource sharing

### 📱 User Experience
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark Mode**: Easy on the eyes interface
- **Real-time Feedback**: Clear loading states and error messages
- **Accessibility**: Keyboard navigation and screen reader support

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- pip package manager

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd rep_contact_app

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp env.example .env
# Edit .env with your configuration

# Initialize database
python3 -c "from app import app, db; with app.app_context(): db.create_all()"
python3 populate_suggestions.py

# Run the application
python3 app.py
```

### Production Deployment
See [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive production setup instructions.

## 🔧 Configuration

### Environment Variables
```bash
# Required
SECRET_KEY=your-super-secret-key
FLASK_ENV=production
DATABASE_URL=sqlite:///instance/rep_contacts.db

# Optional API Keys
CONGRESS_API_KEY=your-congress-gov-api-key
GOOGLE_CIVIC_API_KEY=your-google-civic-api-key
OPENROUTER_API_KEY=your-openrouter-api-key
```

## 📊 Database Schema

### Core Tables
- **Representative**: Human-validated representative data
- **RepresentativePhone**: Phone numbers for representatives
- **RepresentativeSuggestion**: API-sourced suggestion data
- **CallScript**: AI-generated and user-created call scripts
- **CallLog**: Comprehensive call tracking and analytics

### Data Flow
1. **Suggestion Database**: Populated from official APIs (Congress.gov, Google Civic)
2. **Production Database**: Human-validated data only
3. **User Workflow**: Review suggestions → Accept → Add to production

## 🔌 API Integration

### Supported APIs
- **Congress.gov API**: Official congressional data
- **Google Civic Information API**: Additional representative data
- **OpenRouter API**: AI script generation (DeepSeek V3)

### API Endpoints
```
GET  /api/representatives/<zip_code>           # Get representatives
POST /api/representatives/<zip_code>/suggestions    # Get suggestions
POST /api/representatives/<zip_code>/accept-suggestions  # Accept suggestions
POST /api/representatives                        # Add representative
POST /api/scripts                              # Create script
POST /api/generate-script                      # Generate AI script
POST /api/call-logs                            # Log call
GET  /api/call-logs                            # Get call history
GET  /api/call-logs/stats                      # Get analytics
```

## 🎨 User Interface

### Key Components
- **Zip Code Entry**: Simple zip code lookup
- **Representative Cards**: Clean display of rep info and phone numbers
- **Call Workflow**: Streamlined call process with status tracking
- **Script Management**: Create, edit, and use call scripts
- **Analytics Dashboard**: Visual call statistics and trends

### Design Principles
- **Simplicity**: Clean, intuitive interface
- **Accessibility**: WCAG compliant design
- **Responsiveness**: Mobile-first approach
- **Performance**: Fast loading and smooth interactions

## 🔒 Security Features

### Input Validation
- Zip code format validation (5 digits or 5+4 format)
- Phone number validation and formatting
- Name validation (letters, spaces, hyphens, apostrophes only)
- XSS prevention through input sanitization

### Security Headers
- CORS configuration
- Secure session cookies
- Rate limiting (100 requests per hour per IP)
- SQL injection prevention (SQLAlchemy ORM)

## 📈 Analytics & Insights

### Call Tracking
- Call outcomes (person, voicemail, failed)
- Call notes and follow-up tracking
- Representative responsiveness metrics
- Personal call history and trends

### Dashboard Features
- Call success rates over time
- Most contacted representatives
- Script effectiveness analysis
- Civic engagement trends

## 🛠️ Development

### Project Structure
```
rep_contact_app/
├── app.py                 # Main Flask application
├── populate_suggestions.py # Database population script
├── static/               # Frontend assets
│   ├── js/app.js        # Main JavaScript application
│   └── css/             # Stylesheets
├── templates/            # HTML templates
├── instance/            # Database files
├── requirements.txt     # Python dependencies
├── env.example         # Environment template
├── DEPLOYMENT.md       # Production deployment guide
└── README.md           # This file
```

### Key Technologies
- **Backend**: Flask, SQLAlchemy, Python
- **Frontend**: Vanilla JavaScript, Bootstrap 5, HTML5/CSS3
- **Database**: SQLite (production-ready for PostgreSQL)
- **APIs**: Congress.gov, Google Civic, OpenRouter

## 🚨 Error Handling

### User-Friendly Errors
- Clear error messages for invalid inputs
- Graceful handling of API failures
- Helpful suggestions for common issues
- Comprehensive logging for debugging

### Monitoring
- Application logs: `app.log`
- Error tracking and alerting
- Performance monitoring
- Health check endpoints

## 🔄 Updates & Maintenance

### Version Control
- Semantic versioning (v1.0.0)
- Comprehensive change logs
- Backward compatibility maintained

### Database Migrations
- Schema versioning
- Data migration scripts
- Backup and restore procedures

## 📞 Support

### Documentation
- [Deployment Guide](DEPLOYMENT.md)
- API Documentation (in-code comments)
- User Guide (in-app help)

### Troubleshooting
- Common issues and solutions
- Performance optimization tips
- Security best practices

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Code Standards
- Follow PEP 8 Python style guide
- Add comprehensive comments
- Include error handling
- Test thoroughly

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Congress.gov for official representative data
- Google Civic Information API for additional data
- OpenRouter for AI script generation
- Bootstrap for the responsive UI framework

---

**CallRep v1.0** - Making civic engagement easier, one call at a time. 🏛️📞 
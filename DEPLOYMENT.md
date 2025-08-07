# CallRep v1.0 Production Deployment Guide

## 🚀 Quick Start

### 1. Environment Setup
```bash
# Copy environment template
cp env.example .env

# Edit with your production values
nano .env
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Initialize Database
```bash
python3 -c "from app import app, db; with app.app_context(): db.create_all()"
python3 populate_suggestions.py
```

### 4. Run in Production
```bash
# Using Gunicorn (recommended)
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8080 app:app

# Or using Flask directly
python3 app.py
```

## 🔧 Production Configuration

### Environment Variables (Required)
- `SECRET_KEY`: Strong secret key for session security
- `FLASK_ENV`: Set to `production`
- `DATABASE_URL`: Database connection string
- `ALLOWED_ORIGINS`: Comma-separated list of allowed domains

### API Keys (Optional but Recommended)
- `CONGRESS_API_KEY`: Congress.gov API key for representative data
- `GOOGLE_CIVIC_API_KEY`: Google Civic API key for additional data
- `OPENROUTER_API_KEY`: OpenRouter API key for AI script generation

## 🛡️ Security Features Implemented

### Input Validation
- ✅ Zip code format validation (5 digits or 5+4 format)
- ✅ Phone number validation and formatting
- ✅ Name validation (letters, spaces, hyphens, apostrophes only)
- ✅ XSS prevention through input sanitization

### Security Headers
- ✅ CORS configuration
- ✅ Secure session cookies
- ✅ Rate limiting (100 requests per hour per IP)
- ✅ SQL injection prevention (SQLAlchemy ORM)

### Error Handling
- ✅ Comprehensive error logging
- ✅ User-friendly error messages
- ✅ Graceful failure handling

## 📊 Monitoring & Logging

### Log Files
- Application logs: `app.log`
- Access logs: Configure in web server (nginx/apache)

### Health Checks
```bash
# Check if app is running
curl http://localhost:8080/api/representatives/94102

# Check database connectivity
python3 -c "from app import app, db; print('DB OK' if db.engine.execute('SELECT 1') else 'DB Error')"
```

## 🔄 Database Management

### Backup
```bash
# SQLite backup
cp instance/rep_contacts.db backup/rep_contacts_$(date +%Y%m%d_%H%M%S).db

# PostgreSQL backup
pg_dump $DATABASE_URL > backup/callrep_$(date +%Y%m%d_%H%M%S).sql
```

### Migration
```bash
# Recreate database (for schema changes)
rm instance/rep_contacts.db
python3 -c "from app import app, db; with app.app_context(): db.create_all()"
python3 populate_suggestions.py
```

## 🚨 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   lsof -i :8080
   kill -9 <PID>
   ```

2. **Database locked**
   ```bash
   # Check for other processes
   lsof instance/rep_contacts.db
   ```

3. **Permission denied**
   ```bash
   chmod 755 instance/
   chmod 644 instance/rep_contacts.db
   ```

### Performance Optimization

1. **Database Indexing**
   ```sql
   CREATE INDEX idx_representative_zip_code ON representative(zip_code);
   CREATE INDEX idx_representative_deleted_at ON representative(deleted_at);
   ```

2. **Static File Serving**
   - Use nginx for static files in production
   - Enable gzip compression
   - Set proper cache headers

## 📈 Scaling Considerations

### For High Traffic
1. Use PostgreSQL instead of SQLite
2. Implement Redis for session storage
3. Add load balancer (nginx/haproxy)
4. Use CDN for static assets

### Monitoring
1. Set up application monitoring (New Relic, DataDog)
2. Configure log aggregation (ELK stack)
3. Set up alerting for errors and performance issues

## 🔄 Updates & Maintenance

### Updating the Application
```bash
# Backup current version
cp -r /path/to/app /path/to/backup/app_$(date +%Y%m%d)

# Deploy new version
git pull origin main
pip install -r requirements.txt

# Restart application
sudo systemctl restart callrep
```

### Regular Maintenance
- Monitor log files for errors
- Check database size and performance
- Update API keys as needed
- Review and rotate security keys

## 📞 Support

For issues or questions:
1. Check the logs: `tail -f app.log`
2. Review this deployment guide
3. Check the application health endpoints
4. Contact the development team

---

**CallRep v1.0** - Production Ready ✅ 
#!/usr/bin/env python3
"""
Automated deployment script for PythonAnywhere
This script handles database migrations, dependency updates, and common deployment issues.
"""

import os
import sys
import subprocess
import sqlite3
from pathlib import Path

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ {description} completed successfully")
            if result.stdout.strip():
                print(f"   Output: {result.stdout.strip()}")
        else:
            print(f"❌ {description} failed")
            print(f"   Error: {result.stderr.strip()}")
            return False
    except Exception as e:
        print(f"❌ {description} failed with exception: {e}")
        return False
    return True

def check_database_schema():
    """Check if database needs migration"""
    db_path = Path("instance/rep_contacts.db")
    if not db_path.exists():
        print("📊 Database doesn't exist, will create new one")
        return "create"
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(call_log)")
        columns = [column[1] for column in cursor.fetchall()]
        conn.close()
        
        if 'is_test_data' not in columns:
            print("📊 Database needs migration (missing is_test_data column)")
            return "migrate"
        else:
            print("📊 Database schema is up to date")
            return "current"
    except Exception as e:
        print(f"❌ Error checking database schema: {e}")
        return "error"

def migrate_database():
    """Migrate database to add is_test_data column"""
    db_path = Path("instance/rep_contacts.db")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Add the new column
        cursor.execute('ALTER TABLE call_log ADD COLUMN is_test_data BOOLEAN DEFAULT FALSE')
        
        # Mark existing records as test data
        cursor.execute('UPDATE call_log SET is_test_data = TRUE')
        
        conn.commit()
        conn.close()
        print("✅ Database migration completed")
        return True
    except Exception as e:
        print(f"❌ Database migration failed: {e}")
        return False

def create_new_database():
    """Create new database with current schema"""
    try:
        # Import app components
        sys.path.append(os.path.dirname(os.path.abspath(__file__)))
        from app import app, db, Representative, RepresentativePhone, CallLog
        from datetime import datetime, timezone
        
        with app.app_context():
            print("🗄️ Creating database tables...")
            db.create_all()
            
            print("👥 Adding real representatives for zip code 94102...")
            
            # Add Nancy Pelosi (Representative)
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
            
            # Add test call logs
            print("📞 Adding test call logs...")
            
            test_call_1 = CallLog(
                user_id='default_user',
                representative_name='Nancy Pelosi',
                phone_number='(202) 225-4965',
                phone_type='DC Office',
                call_datetime=datetime.now(timezone.utc),
                call_outcome='person',
                call_notes='Test call - spoke with staff member about climate change',
                script_title='Climate Change Script',
                session_id='test-session-1',
                is_test_data=True
            )
            
            test_call_2 = CallLog(
                user_id='default_user',
                representative_name='Alex Padilla',
                phone_number='(202) 224-3553',
                phone_type='DC Office',
                call_datetime=datetime.now(timezone.utc),
                call_outcome='voicemail',
                call_notes='Test call - left voicemail about healthcare',
                script_title='Healthcare Script',
                session_id='test-session-1',
                is_test_data=True
            )
            
            test_call_3 = CallLog(
                user_id='default_user',
                representative_name='Adam Schiff',
                phone_number='(202) 224-3841',
                phone_type='DC Office',
                call_datetime=datetime.now(timezone.utc),
                call_outcome='failed',
                call_notes='Test call - line was busy',
                script_title='Education Script',
                session_id='test-session-1',
                is_test_data=True
            )
            
            db.session.add(test_call_1)
            db.session.add(test_call_2)
            db.session.add(test_call_3)
            
            db.session.commit()
            print("✅ Database created successfully with sample data")
            return True
            
    except Exception as e:
        print(f"❌ Database creation failed: {e}")
        return False

def main():
    """Main deployment process"""
    print("🚀 Starting automated deployment to PythonAnywhere...")
    print("=" * 60)
    
    # Step 1: Pull latest changes
    if not run_command("git pull origin main", "Pulling latest changes from Git"):
        print("❌ Git pull failed. Please check your connection and try again.")
        return
    
    # Step 2: Install/update dependencies
    print("📦 Installing all dependencies from requirements.txt...")
    if not run_command("pip3.10 install --user -r requirements.txt", "Installing all dependencies"):
        print("⚠️ Full requirements installation failed, trying individual packages...")
        # Fallback: install critical packages individually
        critical_packages = [
            "Flask==2.3.3",
            "Flask-SQLAlchemy==3.0.5", 
            "Flask-CORS==4.0.0",
            "python-dotenv==1.0.0",
            "requests==2.31.0"
        ]
        for package in critical_packages:
            run_command(f"pip3.10 install --user {package}", f"Installing {package}")
    else:
        print("✅ All dependencies installed successfully")
    
    # Step 3: Handle database
    db_status = check_database_schema()
    
    if db_status == "create":
        if not create_new_database():
            print("❌ Database creation failed")
            return
    elif db_status == "migrate":
        if not migrate_database():
            print("❌ Database migration failed")
            return
    elif db_status == "error":
        print("❌ Database check failed")
        return
    
    # Step 4: Set file permissions
    db_path = Path("instance/rep_contacts.db")
    if db_path.exists():
        run_command("chmod 666 instance/rep_contacts.db", "Setting database file permissions")
    
    # Step 5: Clear any cached files
    run_command("find . -name '*.pyc' -delete", "Clearing Python cache files")
    
    print("=" * 60)
    print("✅ Automated deployment completed!")
    print("📋 Next steps:")
    print("   1. Go to PythonAnywhere dashboard")
    print("   2. Navigate to Web tab")
    print("   3. Click 'Reload' button")
    print("   4. Test your application")
    print("=" * 60)

if __name__ == "__main__":
    main() 
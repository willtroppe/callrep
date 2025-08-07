#!/usr/bin/env python3
"""
Debug script to check what's actually in the database for 94102
Run this on PythonAnywhere to see what's really happening
"""

import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db, Representative, RepresentativePhone

def main():
    print("🔍 Debugging 94102 representatives in database")
    print("=" * 60)
    
    with app.app_context():
        print("📊 Database connection test...")
        try:
            # Test database connection
            total_reps = Representative.query.count()
            print(f"✅ Database connected. Total representatives: {total_reps}")
        except Exception as e:
            print(f"❌ Database connection failed: {e}")
            return
        
        print(f"\n🔍 Checking for 94102 representatives...")
        
        # Check for 94102 representatives
        reps_94102 = Representative.query.filter_by(zip_code='94102').all()
        print(f"Found {len(reps_94102)} representatives for 94102:")
        
        for rep in reps_94102:
            print(f"  - {rep.first_name} {rep.last_name} ({rep.position})")
            print(f"    ID: {rep.id}, Deleted: {rep.deleted_at}")
            
            # Check phone numbers
            phones = RepresentativePhone.query.filter_by(representative_id=rep.id).all()
            print(f"    Phone numbers: {len(phones)}")
            for phone in phones:
                print(f"      - {phone.phone_type}: {phone.phone} ext. {phone.extension or 'none'} (Deleted: {phone.deleted_at})")
        
        print(f"\n🔍 Checking for non-deleted 94102 representatives...")
        active_reps_94102 = Representative.query.filter_by(zip_code='94102', deleted_at=None).all()
        print(f"Found {len(active_reps_94102)} active representatives for 94102:")
        
        for rep in active_reps_94102:
            print(f"  - {rep.first_name} {rep.last_name} ({rep.position})")
            active_phones = RepresentativePhone.query.filter_by(representative_id=rep.id, deleted_at=None).all()
            print(f"    Active phone numbers: {len(active_phones)}")
        
        print(f"\n🔍 Checking all zip codes in database...")
        zip_codes = db.session.query(Representative.zip_code).distinct().all()
        print(f"All zip codes in database: {[z[0] for z in zip_codes]}")
        
        print(f"\n🔍 Testing API endpoint simulation...")
        try:
            # Simulate what the API endpoint does
            api_result = Representative.query.filter_by(zip_code='94102', deleted_at=None).all()
            print(f"API would return {len(api_result)} representatives:")
            for rep in api_result:
                rep_dict = rep.to_dict()
                print(f"  - {rep_dict['full_name']} ({rep_dict['position']})")
                print(f"    Phone numbers: {len(rep_dict['phone_numbers'])}")
        except Exception as e:
            print(f"❌ API simulation failed: {e}")
    
    print("=" * 60)
    print("🏁 Debug complete")

if __name__ == "__main__":
    main()
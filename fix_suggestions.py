#!/usr/bin/env python3
"""
Quick fix: Just populate the fucking suggestion database
Run this on PythonAnywhere: python3.10 fix_suggestions.py
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db, RepresentativeSuggestion, RepresentativeSuggestionPhone

with app.app_context():
    # Clear existing suggestions
    RepresentativeSuggestion.query.delete()
    RepresentativeSuggestionPhone.query.delete()
    db.session.commit()
    
    # Add 22205 suggestions (Virginia)
    warner = RepresentativeSuggestion(
        zip_code='22205',
        first_name='Mark',
        last_name='Warner',
        position='Senator',
        state='VA',
        district='',
        source='congress_gov'
    )
    db.session.add(warner)
    db.session.flush()
    
    warner_phone = RepresentativeSuggestionPhone(
        representative_suggestion_id=warner.id,
        phone='(202) 224-2023',
        extension='',
        phone_type='DC Office'
    )
    db.session.add(warner_phone)
    
    kaine = RepresentativeSuggestion(
        zip_code='22205',
        first_name='Tim',
        last_name='Kaine',
        position='Senator',
        state='VA',
        district='',
        source='congress_gov'
    )
    db.session.add(kaine)
    db.session.flush()
    
    kaine_phone = RepresentativeSuggestionPhone(
        representative_suggestion_id=kaine.id,
        phone='(202) 224-4024',
        extension='',
        phone_type='DC Office'
    )
    db.session.add(kaine_phone)
    
    db.session.commit()
    print("✅ Added 22205 suggestions: Mark Warner and Tim Kaine")
    print("Now auto-populate should work for 22205")
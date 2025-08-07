#!/usr/bin/env python3
"""
Simple script to populate the suggestion database with direct phone numbers.
"""

from datetime import datetime, timezone
from app import app, db, RepresentativeSuggestion, RepresentativeSuggestionPhone

def populate_suggestion_database():
    """Populate the suggestion database with direct phone numbers"""
    with app.app_context():
        # Clear existing suggestions
        RepresentativeSuggestion.query.delete()
        RepresentativeSuggestionPhone.query.delete()
        db.session.commit()
        
        print("Cleared existing suggestions")
        
        # Direct phone numbers for senators and representatives
        direct_phones = {
            # Senators
            'Alex Padilla': '(202) 224-3553',
            'Adam Schiff': '(202) 224-3841',
            'Kirsten Gillibrand': '(202) 224-4451',
            'Chuck Schumer': '(202) 224-6542',
            'Mark Warner': '(202) 224-2023',
            'Tim Kaine': '(202) 224-4024',
            'John Cornyn': '(202) 224-2934',
            'Ted Cruz': '(202) 224-5922',
            'Marco Rubio': '(202) 224-3041',
            'Rick Scott': '(202) 224-5274',
            'Bob Casey': '(202) 224-6324',
            'John Fetterman': '(202) 224-4254',
            'Sherrod Brown': '(202) 224-2315',
            'J.D. Vance': '(202) 224-3353',
            'Dick Durbin': '(202) 224-2152',
            'Tammy Duckworth': '(202) 224-2854',
            'Jon Ossoff': '(202) 224-3643',
            'Raphael Warnock': '(202) 224-3643',
            'Thom Tillis': '(202) 224-6342',
            'Ted Budd': '(202) 224-3154',
            
            # Representatives
            'Brad Sherman': '(202) 225-5911',
            'Nancy Pelosi': '(202) 225-4965',
            'Kevin McCarthy': '(202) 225-2915',
            'Hakeem Jeffries': '(202) 225-5936',
            'Steve Scalise': '(202) 225-3015',
            'Jim Jordan': '(202) 225-2676',
            'Adam Schiff': '(202) 225-4176',
            'Katie Porter': '(202) 225-5611',
            'Ro Khanna': '(202) 225-2631',
            'Barbara Lee': '(202) 225-2661'
        }
        
        # Sample zip codes by state
        state_zip_codes = {
            'CA': ['90210', '94102', '92101', '90001', '92614'],
            'NY': ['10001', '10002', '10003', '10004', '10005'],
            'VA': ['22205', '22206', '22207', '22208', '22209'],
            'TX': ['77001', '77002', '77003', '77004', '77005'],
            'FL': ['33101', '33102', '33103', '33104', '33105'],
            'IL': ['60601', '60602', '60603', '60604', '60605'],
            'PA': ['19101', '19102', '19103', '19104', '19105'],
            'OH': ['43201', '43202', '43203', '43204', '43205'],
            'GA': ['30301', '30302', '30303', '30304', '30305'],
            'NC': ['28201', '28202', '28203', '28204', '28205']
        }
        
        # Add senators for each state
        senators_by_state = {
            'CA': [('Alex', 'Padilla'), ('Adam', 'Schiff')],
            'NY': [('Kirsten', 'Gillibrand'), ('Chuck', 'Schumer')],
            'VA': [('Mark', 'Warner'), ('Tim', 'Kaine')],
            'TX': [('John', 'Cornyn'), ('Ted', 'Cruz')],
            'FL': [('Marco', 'Rubio'), ('Rick', 'Scott')],
            'PA': [('Bob', 'Casey'), ('John', 'Fetterman')],
            'OH': [('Sherrod', 'Brown'), ('J.D.', 'Vance')],
            'IL': [('Dick', 'Durbin'), ('Tammy', 'Duckworth')],
            'GA': [('Jon', 'Ossoff'), ('Raphael', 'Warnock')],
            'NC': [('Thom', 'Tillis'), ('Ted', 'Budd')]
        }
        
        suggestions_added = 0
        
        for state, senators in senators_by_state.items():
            zip_codes = state_zip_codes.get(state, [])
            for zip_code in zip_codes:
                for first_name, last_name in senators:
                    full_name = f"{first_name} {last_name}"
                    direct_phone = direct_phones.get(full_name, '(202) 224-3121')
                    
                    suggestion = RepresentativeSuggestion(
                        zip_code=zip_code,
                        first_name=first_name,
                        last_name=last_name,
                        position='Senator',
                        state=state,
                        district='',
                        source='congress_gov'
                    )
                    
                    db.session.add(suggestion)
                    db.session.flush()
                    
                    phone = RepresentativeSuggestionPhone(
                        representative_suggestion_id=suggestion.id,
                        phone=direct_phone,
                        extension='',
                        phone_type='DC Office' if direct_phone != '(202) 224-3121' else 'Senate Switchboard'
                    )
                    db.session.add(phone)
                    
                    suggestions_added += 1
                    print(f"Added {full_name} (Senator) for {zip_code} with phone {direct_phone}")
        
        db.session.commit()
        print(f"Successfully added {suggestions_added} suggestions to database")

if __name__ == '__main__':
    populate_suggestion_database() 
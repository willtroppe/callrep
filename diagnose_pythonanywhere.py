#!/usr/bin/env python3
"""
Diagnostic script for PythonAnywhere Python environment issues
Run this to check Python paths and module availability
"""

import sys
import os
import subprocess

def main():
    print("🔍 PythonAnywhere Python Environment Diagnostic")
    print("=" * 60)
    
    print(f"🐍 Python version: {sys.version}")
    print(f"📍 Python executable: {sys.executable}")
    print(f"📂 Current working directory: {os.getcwd()}")
    
    print(f"\n📚 Python path ({len(sys.path)} entries):")
    for i, path in enumerate(sys.path, 1):
        print(f"   {i:2d}. {path}")
    
    print("\n🔍 Checking for Flask-CORS...")
    try:
        import flask_cors
        print(f"✅ Flask-CORS found: version {flask_cors.__version__}")
        print(f"   Location: {flask_cors.__file__}")
    except ImportError as e:
        print(f"❌ Flask-CORS not found: {e}")
    
    print("\n🔍 Checking other critical imports...")
    modules_to_check = [
        ('flask', 'Flask'),
        ('flask_sqlalchemy', 'Flask-SQLAlchemy'),
        ('requests', 'requests'),
        ('dotenv', 'python-dotenv')
    ]
    
    for module_name, display_name in modules_to_check:
        try:
            module = __import__(module_name)
            version = getattr(module, '__version__', 'unknown')
            location = getattr(module, '__file__', 'unknown')
            print(f"✅ {display_name}: version {version}")
            print(f"   Location: {location}")
        except ImportError as e:
            print(f"❌ {display_name} not found: {e}")
    
    print("\n🔍 Environment variables:")
    relevant_env_vars = ['PATH', 'PYTHONPATH', 'USER', 'HOME']
    for var in relevant_env_vars:
        value = os.environ.get(var, 'Not set')
        print(f"   {var}: {value}")
    
    print("\n🔍 Checking pip installation locations...")
    try:
        result = subprocess.run(['pip3.10', 'show', 'Flask-CORS'], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ Flask-CORS pip info:")
            print(result.stdout)
        else:
            print("❌ Flask-CORS not found in pip")
    except Exception as e:
        print(f"❌ Error running pip: {e}")
    
    print("=" * 60)
    print("📋 Recommended actions:")
    print("1. Copy this output")
    print("2. Check your WSGI configuration file")
    print("3. Ensure your web app uses the same Python environment")
    print("=" * 60)

if __name__ == "__main__":
    main()
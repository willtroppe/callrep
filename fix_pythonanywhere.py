#!/usr/bin/env python3
"""
Quick fix script for PythonAnywhere Flask-CORS issue
Run this in a PythonAnywhere Bash console to install missing dependencies
"""

import subprocess
import sys

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ {description} completed successfully")
            if result.stdout.strip():
                print(f"   Output: {result.stdout.strip()}")
            return True
        else:
            print(f"❌ {description} failed")
            print(f"   Error: {result.stderr.strip()}")
            return False
    except Exception as e:
        print(f"❌ {description} failed with exception: {e}")
        return False

def main():
    print("🚀 Quick fix for Flask-CORS import error on PythonAnywhere")
    print("=" * 60)
    
    # Try to install all requirements first
    if run_command("pip3.10 install --user -r requirements.txt", "Installing all requirements"):
        print("✅ All dependencies installed successfully!")
    else:
        print("⚠️ Full installation failed, trying individual packages...")
        
        # Critical packages for the app to work
        critical_packages = [
            "Flask==2.3.3",
            "Flask-SQLAlchemy==3.0.5", 
            "Flask-CORS==4.0.0",
            "python-dotenv==1.0.0",
            "requests==2.31.0",
            "Werkzeug==2.3.7",
            "python-dateutil==2.8.2"
        ]
        
        success_count = 0
        for package in critical_packages:
            if run_command(f"pip3.10 install --user {package}", f"Installing {package}"):
                success_count += 1
        
        print(f"📊 Successfully installed {success_count}/{len(critical_packages)} packages")
    
    # Verify Flask-CORS installation
    print("\n🔍 Verifying Flask-CORS installation...")
    try:
        import flask_cors
        print("✅ Flask-CORS is now available!")
        print(f"   Version: {flask_cors.__version__}")
    except ImportError:
        print("❌ Flask-CORS still not available. Try running:")
        print("   pip3.10 install --user --force-reinstall Flask-CORS==4.0.0")
    
    print("\n" + "=" * 60)
    print("🔄 Next steps:")
    print("1. Go to your PythonAnywhere Web tab")
    print("2. Click the 'Reload' button for your web app")
    print("3. Check if the error is resolved")
    print("=" * 60)

if __name__ == "__main__":
    main()
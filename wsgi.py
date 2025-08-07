import sys
import os

# Add the project directory to Python path
path = '/home/willtroppe/callrep'
if path not in sys.path:
    sys.path.append(path)

# Import the Flask app
from app import app as application

# For debugging
if __name__ == "__main__":
    application.run() 
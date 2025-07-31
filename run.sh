#!/bin/bash

# Kill any existing process on port 8080
echo "Stopping any existing process on port 8080..."
lsof -ti:8080 | xargs kill -9 2>/dev/null || true

# Start the Flask app
echo "Starting Flask app..."
python3 app.py 
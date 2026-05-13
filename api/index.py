import sys
import os

# Add the backend directory to sys.path so we can import the app
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from main import app

# Vercel needs the app object to be named 'app'
# Since we are importing 'app' from main, it is already named correctly.

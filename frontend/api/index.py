import sys
import os

# Now backend is inside frontend
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from main import app

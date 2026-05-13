import sys
import os

# Go up twice to reach the root, then into backend
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "..", "backend"))

from main import app

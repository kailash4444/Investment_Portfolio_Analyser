# backend/app/core/config.py
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("ZERODHA_API_KEY")
API_SECRET = os.getenv("ZERODHA_API_SECRET")
REDIRECT_URL = os.getenv("ZERODHA_REDIRECT_URL")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173") # Default if not set

if not all([API_KEY, API_SECRET, REDIRECT_URL]):
    print("ERROR: Ensure ZERODHA_API_KEY, ZERODHA_API_SECRET, and ZERODHA_REDIRECT_URL are set in .env")
    # You might want to raise an error or exit here in a real app

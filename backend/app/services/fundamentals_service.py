# backend/app/services/fundamentals_service.py
import logging
import yfinance as yf
import asyncio
from typing import Optional # Import Optional

logging.basicConfig(level=logging.INFO)

# Define which keys we want to extract from yfinance info
# Adjust this list based on the data you find most valuable
FUNDAMENTAL_KEYS = [
    'longName', 'shortName', 'symbol', 'currency', 'quoteType', # Basic Info
    'marketCap', 'totalRevenue', 'revenueGrowth', 'grossMargins', 'operatingMargins', # Financials
    'trailingPE', 'forwardPE', 'pegRatio', 'priceToBook', 'priceToSalesTrailing12Months', # Ratios
    'trailingEps', 'forwardEps', 'earningsGrowth',# Earnings
    'dividendYield', 'dividendRate', 'exDividendDate', 'payoutRatio', # Dividends
    'beta', # Volatility
    'averageVolume', 'volume', # Volume
    'fiftyTwoWeekHigh', 'fiftyTwoWeekLow', '52WeekChange', # Price Action
    'sector', 'industry', 'fullTimeEmployees', # Company Info
    'website', 'logo_url',
    'recommendationKey', 'recommendationMean', # Analyst Ratings
    'regularMarketPrice', 'regularMarketOpen', 'regularMarketDayHigh', 'regularMarketDayLow', # Add current price info too
    # Add more as needed, check ticker.info keys for available data
]

# --- Modified Function ---
async def get_stock_fundamentals(symbol: str, exchange: Optional[str]): # Make exchange Optional
    """
    Fetches fundamental stock data (ticker.info) from Yahoo Finance.
    Handles both Indian exchanges (NSE/BSE requiring suffix) and others (like US stocks, no suffix).
    """
    print(symbol, exchange)
    suffix = "" # Default to no suffix (for US stocks or if exchange is unknown/None)
    log_exchange = exchange if exchange else "Not Specified" # For logging

    # Determine suffix only if exchange is provided and relevant (NSE/BSE)
    if exchange:
        exchange_upper = exchange.upper()
        if exchange_upper == "NSE":
            suffix = ".NS"
        elif exchange_upper == "BSE":
            suffix = ".BO"
        # If exchange is provided but not NSE/BSE (e.g., "NASDAQ", "NYSE", "US"), suffix remains ""

    ticker_symbol = f"{symbol.upper()}{suffix}" # Standardize symbol to uppercase
    logging.info(f"Fetching yfinance fundamentals (info) for: {ticker_symbol} (Symbol: {symbol}, Exchange: {log_exchange})")

    def fetch_sync():
        try:
            ticker = yf.Ticker(ticker_symbol)
            # Fetch the .info dictionary which contains fundamentals
            # Use proxy/user-agent headers if needed to avoid potential blocks, but start simple
            info = ticker.info

            # Check if info dictionary is reasonably populated.
            # Sometimes yfinance returns a dict even for invalid tickers, but it might be mostly empty.
            # Checking for a common field like 'quoteType' or 'currency' might be a good heuristic.
            if not info or not info.get('quoteType'):
                logging.warning(f"Potentially incomplete or invalid yfinance info received for {ticker_symbol}. Info: {info}")
                # Consider it a failure if basic info is missing
                return None # Indicate failure to get valid data

            # Filter the info dict to include only the keys we want
            fundamentals = {key: info.get(key) for key in FUNDAMENTAL_KEYS if key in info}

            # Basic formatting or cleanup if needed (example)
            # Keep the original marketCap, add formatted version if needed by frontend
            # The frontend formatting function is usually better suited for this display logic
            # if 'marketCap' in fundamentals and fundamentals['marketCap']:
            #     fundamentals['marketCapFormatted'] = f"{fundamentals['marketCap']:,}"

            logging.info(f"Successfully fetched fundamentals for {ticker_symbol}")
            return fundamentals

        except Exception as e:
            # Log specific errors, e.g., invalid ticker symbol, network issues
            logging.error(f"yfinance error fetching info for {ticker_symbol}: {e}", exc_info=False) # exc_info=False to avoid long tracebacks for common errors
            return None # Indicate failure

    # Run the synchronous yfinance call in a separate thread
    fundamental_data = await asyncio.to_thread(fetch_sync)
    return fundamental_data

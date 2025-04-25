# backend/app/services/fundamentals_service.py
import logging
import yfinance as yf
import asyncio

logging.basicConfig(level=logging.INFO)

# Define which keys we want to extract from yfinance info
# Adjust this list based on the data you find most valuable
FUNDAMENTAL_KEYS = [
    'longName', 'shortName', 'symbol', 'currency',
    'marketCap', 'totalRevenue', 'revenueGrowth', # Financials
    'trailingPE', 'forwardPE', 'pegRatio', # Ratios
    'trailingEps', 'forwardEps', # Earnings
    'dividendYield', 'dividendRate', 'exDividendDate', 'payoutRatio', # Dividends
    'beta', # Volatility
    'averageVolume', 'volume', # Volume
    'fiftyTwoWeekHigh', 'fiftyTwoWeekLow', '52WeekChange', # Price Action
    'sector', 'industry', 'fullTimeEmployees', # Company Info
    'website', 'logo_url',
    'recommendationKey', # e.g., 'buy', 'hold'
    # Add more as needed, check ticker.info keys for available data
]

async def get_stock_fundamentals(symbol: str, exchange: str):
    """
    Fetches fundamental stock data (ticker.info) from Yahoo Finance.
    """
    suffix = ".NS" if exchange == "NSE" else ".BO" if exchange == "BSE" else ""
    ticker_symbol = f"{symbol}{suffix}"
    logging.info(f"Fetching yfinance fundamentals (info) for: {ticker_symbol}")

    def fetch_sync():
        try:
            ticker = yf.Ticker(ticker_symbol)
            info = ticker.info # Get the fundamentals dictionary

            if not info or info.get('regularMarketPrice') is None: # Check if info is populated
                logging.warning(f"Potentially incomplete or missing yfinance info for {ticker_symbol}")
                # Return None or an empty dict if crucial info is missing
                return None # Indicate failure to get valid data

            # Filter the info dict to include only the keys we want
            fundamentals = {key: info.get(key) for key in FUNDAMENTAL_KEYS if key in info}

            # Basic formatting or cleanup if needed (example)
            if 'marketCap' in fundamentals and fundamentals['marketCap']:
                fundamentals['marketCapFormatted'] = f"{fundamentals['marketCap']:,}" # Add commas

            logging.info(f"Successfully fetched fundamentals for {ticker_symbol}")
            return fundamentals

        except Exception as e:
            logging.error(f"yfinance error fetching info for {ticker_symbol}: {e}", exc_info=False)
            return None # Indicate failure

    fundamental_data = await asyncio.to_thread(fetch_sync)
    return fundamental_data
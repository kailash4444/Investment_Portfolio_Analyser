# backend/app/services/zerodha_service.py
from kiteconnect import KiteConnect
from kiteconnect.exceptions import TokenException, InputException
from fastapi import HTTPException # Import HTTPException
from ..core import config # Import your config module
import logging
import asyncio
import threading # For thread-safe access if needed, though less critical for single user
import yfinance as yf # Import yfinance

logging.basicConfig(level=logging.INFO)

# --- In-memory storage for the single user's token ---
_current_access_token = None
_kite_instance = None
_lock = threading.Lock() # To prevent race conditions if updating/reading token

def initialize_kite_instance():
    """(Re)Initializes the KiteConnect instance using the current token."""
    global _kite_instance
    global _current_access_token
    with _lock:
        if _current_access_token and config.API_KEY:
            try:
                _kite_instance = KiteConnect(api_key=config.API_KEY, access_token=_current_access_token)
                # Optional: Verify token validity here if desired (adds latency)
                # _ = _kite_instance.profile()
                logging.info("KiteConnect instance created/updated with new token.")
                return True
            except TokenException as te:
                logging.error(f"Failed to initialize KiteConnect with token: {te}. Token might be invalid.")
                _kite_instance = None
                _current_access_token = None # Clear invalid token
                return False
            except Exception as e:
                logging.error(f"Unexpected error initializing KiteConnect: {e}")
                _kite_instance = None
                _current_access_token = None
                return False
        else:
            logging.warning("Cannot initialize KiteConnect: Access token or API Key is missing.")
            _kite_instance = None
            return False

def update_access_token(new_token: str):
    """Updates the access token and re-initializes the Kite instance."""
    global _current_access_token
    with _lock:
        _current_access_token = new_token
        print(_current_access_token)
        logging.info("Access token updated in memory.")
    initialize_kite_instance() # Re-initialize with the new token

def get_kite() -> KiteConnect:
    """Provides the initialized KiteConnect instance. Raises error if unavailable."""
    with _lock:
        if _kite_instance is None:
            # Maybe try to initialize again? Or rely on the login flow.
            logging.error("Attempted to use Kite Connect, but it's not initialized or token is invalid.")
            # Frontend should ideally redirect user to login if this happens
            raise HTTPException(
                status_code=401, # Unauthorized is appropriate here
                detail="Zerodha connection not available or token expired. Please connect via settings."
            )
        return _kite_instance

# --- Service Functions (using get_kite()) ---

async def fetch_portfolio_holdings():
    """Fetches user's portfolio holdings. (Keep this as is)"""
    try:
        kite = get_kite() # Get current valid instance
        holdings = await asyncio.to_thread(kite.holdings) # Run blocking call in thread
        logging.info(f"Fetched {len(holdings)} holdings.")
        return holdings
    except TokenException as te:
        logging.error(f"TokenException while fetching holdings: {te}. Token likely expired.")
        global _kite_instance, _current_access_token
        with _lock:
             _kite_instance = None
             _current_access_token = None
        raise HTTPException(status_code=401, detail="Zerodha token expired or invalid. Please reconnect.")
    except HTTPException as http_exc: # Catch the 401 from get_kite()
         raise http_exc
    except Exception as e:
        logging.error(f"Error fetching holdings: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch holdings from Zerodha: {e}")


async def get_current_price_yfinance(symbol: str, exchange: str):
    """
    Fetches the potentially delayed current price from Yahoo Finance using yfinance.
    Runs synchronous yfinance calls in a separate thread.
    """
    # Map Zerodha exchange to yfinance ticker suffix
    suffix = ".NS" if exchange == "NSE" else ".BO" if exchange == "BSE" else ""
    ticker_symbol = f"{symbol}{suffix}"

    logging.debug(f"Fetching yfinance data for: {ticker_symbol}")

    def fetch_sync():
        """Synchronous helper function to be run in a thread."""
        try:
            ticker = yf.Ticker(ticker_symbol)
            # ticker.info is usually faster for current data
            data = ticker.info
            # Common fields for current price
            price = data.get('currentPrice') or data.get('regularMarketPrice')

            if price:
                logging.debug(f"yfinance price found via info for {ticker_symbol}: {price}")
                return float(price)
            else:
                # Fallback: Get the last closing price from history if info lacks price
                logging.warning(f"Could not find currentPrice/regularMarketPrice in yfinance info for {ticker_symbol}. Fetching history...")
                hist = ticker.history(period="5d", interval="1d") # Get last few days
                if not hist.empty:
                    last_close = hist['Close'].iloc[-1]
                    logging.debug(f"yfinance price found via history (last close) for {ticker_symbol}: {last_close}")
                    return float(last_close)
                else:
                     logging.warning(f"No price found in info or history for {ticker_symbol}")
                     return None # No price found
        except Exception as e:
            # Catch potential errors during yfinance fetch (e.g., invalid ticker, network issue)
            logging.error(f"yfinance error fetching price for {ticker_symbol}: {e}", exc_info=False) # exc_info=False to avoid huge logs for common errors
            return None # Indicate failure

    # Run the synchronous function in a thread pool executor
    price = await asyncio.to_thread(fetch_sync)
    return price


async def process_portfolio_details():
    """
    Fetches holdings and calculates current values using yfinance for prices.
    """
    holdings = await fetch_portfolio_holdings()
    if not holdings:
        logging.info("No holdings found.")
        return []

    processed_portfolio = []
    logging.info(f"Processing {len(holdings)} holdings using yfinance for current prices...")

    # --- Fetch prices concurrently using asyncio.gather ---
    price_tasks = []
    for item in holdings:
        # Create a task for each price fetch
        task = asyncio.create_task(
            get_current_price_yfinance(item['tradingsymbol'], item['exchange'])
        )
        price_tasks.append(task)

    # Wait for all the price fetching tasks to complete
    # results will be a list of prices (or None) in the same order as holdings
    current_prices_results = await asyncio.gather(*price_tasks)
    # --- End of concurrent fetching ---


    # --- Process each holding with its fetched price ---
    for i, item in enumerate(holdings):
        current_price = current_prices_results[i] # Get the price corresponding to this item

        # Decide how to handle calculation if price fetch failed
        if current_price is None:
            logging.warning(f"Using average price for P&L calculation for {item['tradingsymbol']} as yfinance fetch failed.")
            # Fallback: Use average price for calculation, but store None as last_price
            price_for_calc = item['average_price']
            fetched_price_display = None # Indicate price fetch failed
        else:
            price_for_calc = current_price
            fetched_price_display = current_price # Store the actual fetched price

        # Perform calculations
        current_value = item['quantity'] * price_for_calc
        invested_value = item['quantity'] * item['average_price']
        pnl = current_value - invested_value

        # Append processed data for this item
        processed_portfolio.append({
            "tradingsymbol": item['tradingsymbol'],
            "exchange": item['exchange'],
            "quantity": item['quantity'],
            "average_price": item['average_price'],
            "invested_amount": round(invested_value, 2),
            "last_price": fetched_price_display, # Store the yfinance price (delayed, or None)
            "current_value": round(current_value, 2), # Calculated using fetched price or fallback
            "pnl": round(pnl, 2),
            "instrument_token": item['instrument_token'] # Keep instrument token
        })

    logging.info("Finished processing portfolio details.")
    return processed_portfolio


# --- Function to check connection status (Keep this) ---
def get_connection_status():
    """Checks if the Kite instance seems to be initialized."""
    with _lock:
        return _kite_instance is not None


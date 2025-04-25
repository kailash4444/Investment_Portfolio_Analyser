# backend/app/services/history_service.py
import logging
import yfinance as yf
import pandas as pd
import asyncio
from datetime import datetime, timedelta

logging.basicConfig(level=logging.INFO)

# Mapping user periods to yfinance period and interval
# Adjust intervals based on what looks best for the period
PERIOD_INTERVAL_MAP = {
    "1d": {"period": "1d", "interval": "1m"}, # 1 minute intervals for 1 day
    "5d": {"period": "5d", "interval": "15m"}, # 15 minute intervals for 5 days
    "1mo": {"period": "1mo", "interval": "1h"}, # 1 hour intervals for 1 month
    "6mo": {"period": "6mo", "interval": "1d"}, # 1 day intervals for 6 months
    "1y": {"period": "1y", "interval": "1d"}, # 1 day intervals for 1 year
    "5y": {"period": "5y", "interval": "1wk"}, # 1 week intervals for 5 years
    "max": {"period": "max", "interval": "1mo"}, # 1 month intervals for max
}

async def get_stock_history(symbol: str, exchange: str, period_key: str = "1y"):
    """
    Fetches historical stock data from Yahoo Finance for a given period.
    """
    suffix = ".NS" if exchange == "NSE" else ".BO" if exchange == "BSE" else ""
    ticker_symbol = f"{symbol}{suffix}"

    if period_key not in PERIOD_INTERVAL_MAP:
        logging.warning(f"Invalid period key '{period_key}'. Defaulting to '1y'.")
        period_key = "1y"

    params = PERIOD_INTERVAL_MAP[period_key]
    logging.info(f"Fetching yfinance history for {ticker_symbol} with period={params['period']}, interval={params['interval']}")

    def fetch_sync():
        try:
            ticker = yf.Ticker(ticker_symbol)
            history = ticker.history(period=params["period"], interval=params["interval"])

            if history.empty:
                logging.warning(f"No history data found for {ticker_symbol} with period {period_key}")
                return None

            # Ensure the index is DatetimeIndex and timezone-aware (make it UTC for consistency)
            if not isinstance(history.index, pd.DatetimeIndex):
                 history.index = pd.to_datetime(history.index)
            if history.index.tz is None:
                 history.index = history.index.tz_localize('UTC')
            else:
                 history.index = history.index.tz_convert('UTC')

            # Format for Chart.js (timestamps and prices)
            # Convert timestamps to ISO 8601 string format, which date adapters can parse
            labels = history.index.strftime('%Y-%m-%dT%H:%M:%SZ').tolist()
            data = history['Close'].tolist()

            return {"labels": labels, "data": data}

        except Exception as e:
            logging.error(f"yfinance error fetching history for {ticker_symbol} ({period_key}): {e}", exc_info=False)
            return None

    chart_data = await asyncio.to_thread(fetch_sync)
    return chart_data
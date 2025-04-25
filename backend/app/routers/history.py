# backend/app/routers/history.py
from fastapi import APIRouter, HTTPException, Query
from ..services import history_service # Import the new service
import logging

router = APIRouter(
    prefix="/api/v1/history",
    tags=["Stock History"],
    responses={404: {"description": "Not found"}},
)

# Define allowed period keys explicitly for validation/documentation
VALID_PERIODS = list(history_service.PERIOD_INTERVAL_MAP.keys())

@router.get("/{exchange}/{symbol}",
            summary="Get Stock Historical Data",
            description="Fetches historical closing prices for a stock symbol for a specified period.")
async def get_symbol_history(
    exchange: str,
    symbol: str,
    period: str = Query("1y", enum=VALID_PERIODS, description="Time period (e.g., 1d, 5d, 1mo, 1y, 5y, max)")
):
    """
    Retrieves historical stock data. Requires exchange, symbol, and an optional period.
    """
    logging.info(f"Received history request for {exchange}:{symbol}, period={period}")
    try:
        chart_data = await history_service.get_stock_history(symbol, exchange, period)
        if chart_data is None:
            # Handle case where yfinance returned no data or errored
            raise HTTPException(status_code=404, detail=f"Could not retrieve history for {exchange}:{symbol} for period {period}")
        return chart_data # Returns {"labels": [...], "data": [...]}
    except Exception as e:
        logging.exception(f"Error in history endpoint for {exchange}:{symbol}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error retrieving stock history.")
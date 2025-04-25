# backend/app/routers/fundamentals.py
from fastapi import APIRouter, HTTPException
from ..services import fundamentals_service # Import the new service
import logging

router = APIRouter(
    prefix="/api/v1/fundamentals",
    tags=["Stock Fundamentals"],
    responses={404: {"description": "Not found"}},
)

@router.get("/{exchange}/{symbol}",
            summary="Get Stock Fundamental Data",
            description="Fetches key fundamental data points for a stock symbol from Yahoo Finance.")
async def get_symbol_fundamentals(exchange: str, symbol: str):
    """
    Retrieves fundamental data for the given stock.
    """
    logging.info(f"Received fundamentals request for {exchange}:{symbol}")
    try:
        data = await fundamentals_service.get_stock_fundamentals(symbol, exchange)
        if data is None:
            # Handle case where yfinance returned no data or errored
            raise HTTPException(status_code=404, detail=f"Could not retrieve fundamental data for {exchange}:{symbol}")
        return data # Returns the filtered dictionary
    except Exception as e:
        logging.exception(f"Error in fundamentals endpoint for {exchange}:{symbol}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error retrieving stock fundamentals.")
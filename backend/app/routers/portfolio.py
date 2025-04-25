# backend/app/routers/portfolio.py

from fastapi import APIRouter, Depends, HTTPException # Import necessary FastAPI components
from typing import List # To define list responses
import logging

# Import the service function that does the actual work
from ..services import zerodha_services

# Import Pydantic models for request/response validation (Create this file if needed)
# from ..models import portfolio_models

# Placeholder for the actual Pydantic model - replace with your definition
# Example: Create a file 'backend/app/models/portfolio_models.py'
# from pydantic import BaseModel
# class PortfolioItem(BaseModel):
#     tradingsymbol: str
#     exchange: str
#     quantity: int
#     average_price: float
#     invested_amount: float
#     last_price: float | None # Allow None if LTP fetch fails
#     current_value: float
#     pnl: float
#     instrument_token: int

# Define the router
router = APIRouter(
    prefix="/api/v1/portfolio", # Base path for all endpoints in this file
    tags=["Portfolio"],         # Tag for grouping in Swagger UI docs
    # dependencies=[Depends(get_token_header)], # Example for adding auth dependencies later
    responses={404: {"description": "Not found"}}, # Default response for this router
)

@router.get("/",
            # response_model=List[portfolio_models.PortfolioItem], # Uncomment & use your Pydantic model
            summary="Get Processed Portfolio Holdings",
            description="Retrieves the user's stock holdings from Zerodha, calculates current values and P&L.")
async def get_processed_portfolio():
    """
    Fetches holdings, gets current prices, and returns a processed list.
    Handles potential errors during Zerodha API calls.
    """
    try:
        # Call the processing function from the service layer
        processed_data = await zerodha_services.process_portfolio_details()
        if processed_data is None:
            # Handle case where service explicitly returns None (e.g., connection issue handled there)
             raise HTTPException(status_code=503, detail="Could not retrieve portfolio details from service.")
        return processed_data
    except HTTPException as http_exc:
        # Re-raise exceptions that are already HTTPException (like 401 from service)
        raise http_exc
    except Exception as e:
        # Catch any other unexpected errors from the service layer or this file
        logging.exception(f"Unexpected error processing portfolio request: {e}") # Log the full traceback
        raise HTTPException(status_code=500, detail=f"An internal server error occurred: {e}")


# You could add other portfolio-related endpoints here later, e.g.:
# @router.get("/{instrument_token}/details")
# async def get_stock_details(instrument_token: int):
#     # Logic to get specific details for one stock
#     pass
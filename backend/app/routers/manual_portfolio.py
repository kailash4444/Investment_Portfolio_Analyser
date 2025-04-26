# backend/app/routers/manual_portfolio.py
from fastapi import APIRouter, HTTPException, status
from typing import List
from ..services import manual_portfolio_service
# Import the detailed model now
from ..models.portfolio_models import ManualHoldingCreate, ManualHoldingDisplay, ManualHoldingDetails
import logging

router = APIRouter(
    prefix="/api/v1/manual_portfolio",
    tags=["Manual Portfolio (USD)"],
    responses={404: {"description": "Not found"}},
)

@router.post("/", # Keep POST as is
             response_model=ManualHoldingDisplay,
             status_code=status.HTTP_201_CREATED,
             summary="Add Manual USD Holding")
async def add_holding_endpoint(holding: ManualHoldingCreate):
    # ... (no changes needed here) ...
     try:
        new_holding = await manual_portfolio_service.add_manual_holding(holding)
        return new_holding
     except Exception as e:
        logging.exception(f"Error adding manual holding: {holding.symbol}")
        raise HTTPException(status_code=500, detail="Failed to add manual holding.")


# --- UPDATE THE GET ENDPOINT ---
@router.get("/",
            response_model=List[ManualHoldingDetails], # Update response model
            summary="Get Manual USD Holdings with Details")
async def get_holdings_endpoint():
    """Retrieves all manually entered USD holdings with current price/value/pnl."""
    try:
        # Call the service function that does calculations
        holdings = await manual_portfolio_service.get_manual_holding_details()
        return holdings
    except Exception as e:
        logging.exception("Error getting manual holding details")
        raise HTTPException(status_code=500, detail="Failed to retrieve manual holdings.")
# --- END OF UPDATE ---

@router.delete("/{holding_id}", # Keep DELETE as is
               status_code=status.HTTP_204_NO_CONTENT,
               summary="Delete Manual USD Holding")
async def delete_holding_endpoint(holding_id: int):
    # ... (no changes needed here) ...
     deleted = await manual_portfolio_service.delete_manual_holding(holding_id)
     if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Manual holding with ID {holding_id} not found.")
     return
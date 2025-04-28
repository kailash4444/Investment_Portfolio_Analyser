# backend/app/routers/manual_portfolio.py
from fastapi import APIRouter, HTTPException, status, Depends # Import Depends
from typing import List
from sqlmodel import Session # Import Session
from ..services import manual_portfolio_service
from ..models.portfolio_models import ManualHolding, ManualHoldingCreate, ManualHoldingUpdate, ManualHoldingRead, ManualHoldingDetails # Adjust imports if needed
from ..database import get_session # Import the session dependency
import logging

router = APIRouter(
    prefix="/api/v1/manual_portfolio",
    tags=["Manual Portfolio (USD)"],
    responses={404: {"description": "Not found"}},
)

@router.post("/", response_model=ManualHoldingRead, status_code=status.HTTP_201_CREATED) # Return ManualHoldingRead
async def add_holding_endpoint(holding: ManualHoldingCreate, db: Session = Depends(get_session)):
    try:
        db_holding = manual_portfolio_service.add_manual_holding_db(db=db, holding_data=holding)
        # Calculate invested amount for response model
        read_model = ManualHoldingRead(
            **db_holding.dict(),
            invested_amount_usd=round(db_holding.quantity * db_holding.average_price_usd, 2)
        )
        return read_model
    except Exception as e: # Handle specific DB errors if needed
        logging.exception(f"Error adding manual holding: {holding.tradingsymbol}")
        raise HTTPException(status_code=400, detail=f"Failed to add holding: {e}") # Maybe 400 Bad Request

@router.get("/", response_model=List[ManualHoldingDetails])
async def get_holdings_endpoint(db: Session = Depends(get_session)): # Inject session
    # Pass session to service layer
    holdings = await manual_portfolio_service.get_manual_holding_details_db(db=db)
    return holdings

@router.put("/{holding_id}", response_model=ManualHoldingRead) # Return ManualHoldingRead
async def update_holding_endpoint(holding_id: int, holding_update: ManualHoldingUpdate, db: Session = Depends(get_session)):
    db_holding = manual_portfolio_service.update_manual_holding_db(db=db, holding_id=holding_id, update_data=holding_update)
    if db_holding is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Holding with ID {holding_id} not found.")
    # Calculate invested amount for response model
    read_model = ManualHoldingRead(
        **db_holding.dict(),
        invested_amount_usd=round(db_holding.quantity * db_holding.average_price_usd, 2)
    )
    return read_model

@router.delete("/{holding_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_holding_endpoint(holding_id: int, db: Session = Depends(get_session)):
    deleted = manual_portfolio_service.delete_manual_holding_db(db=db, holding_id=holding_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Holding with ID {holding_id} not found.")
    return # Return No Content

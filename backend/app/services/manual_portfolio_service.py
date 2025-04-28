# backend/app/services/manual_portfolio_service.py
import logging
import asyncio
from typing import List, Optional
from sqlmodel import Session, select # Import Session and select
from .fundamentals_service import get_stock_fundamentals
# Import SQLModel versions and API models
from ..models.portfolio_models import ManualHolding, ManualHoldingCreate, ManualHoldingUpdate, ManualHoldingRead, ManualHoldingDetails

logging.basicConfig(level=logging.INFO)

# --- Service functions now take a Session ---

def add_manual_holding_db(db: Session, holding_data: ManualHoldingCreate) -> ManualHolding:
    """Adds a new manual holding to the database."""
    # Create DB model instance
    db_holding = ManualHolding.from_orm(holding_data) # Create from Pydantic model
    db.add(db_holding)
    db.commit()
    db.refresh(db_holding) # Get ID and other defaults back from DB
    logging.info(f"Added manual holding ID {db_holding.id}: {db_holding.tradingsymbol}")
    return db_holding

def get_holding_by_id_db(db: Session, holding_id: int) -> Optional[ManualHolding]:
     """Helper to get a single holding by ID."""
     return db.get(ManualHolding, holding_id)

def update_manual_holding_db(db: Session, holding_id: int, update_data: ManualHoldingUpdate) -> Optional[ManualHolding]:
    """Updates an existing manual holding in the database."""
    db_holding = get_holding_by_id_db(db, holding_id)
    if not db_holding:
        logging.warning(f"Attempted to update non-existent manual holding ID {holding_id}")
        return None

    # Get data from update model
    holding_data = update_data.dict(exclude_unset=True) # Don't include fields not sent
    for key, value in holding_data.items():
        setattr(db_holding, key, value) # Update fields

    db.add(db_holding)
    db.commit()
    db.refresh(db_holding)
    logging.info(f"Updated manual holding ID {holding_id}: {db_holding.tradingsymbol}")
    return db_holding

def delete_manual_holding_db(db: Session, holding_id: int) -> bool:
    """Deletes a manual holding by ID from the database."""
    db_holding = get_holding_by_id_db(db, holding_id)
    if db_holding:
        db.delete(db_holding)
        db.commit()
        logging.info(f"Deleted manual holding ID {holding_id}")
        return True
    logging.warning(f"Attempted to delete non-existent manual holding ID {holding_id}")
    return False

# --- Function to get details (still async because of price fetching) ---
async def get_manual_holding_details_db(db: Session) -> List[ManualHoldingDetails]:
    """Retrieves holdings from DB and fetches current price/value using yfinance."""
    # Fetch all holdings from the database
    statement = select(ManualHolding)
    holdings_from_db = db.exec(statement).all() # This is synchronous

    if not holdings_from_db:
        return []

    logging.info(f"Processing details for {len(holdings_from_db)} manual holdings from DB...")
    processed_holdings: List[ManualHoldingDetails] = []

    # Fetch prices concurrently (async part)
    price_tasks = [
        asyncio.create_task(get_stock_fundamentals(h.tradingsymbol, h.exchange or 'US'))
        for h in holdings_from_db
    ]
    results = await asyncio.gather(*price_tasks, return_exceptions=True)

    # Process results and combine with DB data
    for i, db_holding in enumerate(holdings_from_db):
        result = results[i]
        current_price, current_value, pnl = None, None, None

        if not isinstance(result, Exception) and result:
            price_found = result.get('currentPrice') or result.get('regularMarketPrice')
            if price_found is not None:
                try: current_price = float(price_found)
                except Exception: pass # Ignore conversion error

        if current_price is not None:
            try:
                current_value = db_holding.quantity * current_price
                # Calculate invested amount on the fly for display model
                invested_amount = db_holding.quantity * db_holding.average_price_usd
                pnl = current_value - invested_amount
            except Exception: current_value, pnl = None, None

        # Create the detailed response model
        processed_holdings.append(
            ManualHoldingDetails(
                id=db_holding.id,
                tradingsymbol=db_holding.tradingsymbol,
                exchange=db_holding.exchange,
                quantity=db_holding.quantity,
                average_price_usd=db_holding.average_price_usd,
                invested_amount_usd=round(db_holding.quantity * db_holding.average_price_usd, 2), # Recalculate for display
                last_price_usd=current_price,
                current_value_usd=round(current_value, 2) if current_value is not None else None,
                pnl_usd=round(pnl, 2) if pnl is not None else None
            )
        )
    logging.info("Finished processing manual holding details from DB.")
    return processed_holdings

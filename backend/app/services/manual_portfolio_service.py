# backend/app/services/manual_portfolio_service.py
import logging
import asyncio
from typing import List, Dict, Optional
# Import the yfinance fetcher (adapt path if needed)
# We need a function returning price, get_stock_fundamentals returns .info dict
from .fundamentals_service import get_stock_fundamentals
from .zerodha_services import get_current_price_yfinance
# Import Pydantic models
from ..models.portfolio_models import *

logging.basicConfig(level=logging.INFO)

# --- In-memory Database (Keep as is) ---
manual_holdings_db: Dict[int, ManualHoldingDisplay] = {}
next_holding_id: int = 1
# ---------------------------------------

async def add_manual_holding(holding_data: ManualHoldingCreate) -> ManualHoldingDisplay:
    # ... (Keep existing add function) ...
    global next_holding_id
    # print(next_holding_id)
    # holding_id = len(manual_holdings_db) + 1 # Use the next available ID
    holding_id = next_holding_id
    invested_amount = holding_data.quantity * holding_data.average_price_usd
    new_holding = ManualHoldingDisplay(
        id=holding_id,
        invested_amount_usd=round(invested_amount, 2),
        **holding_data.dict()
    )
    manual_holdings_db[holding_id] = new_holding
    next_holding_id += 1
    logging.info(f"Added manual holding ID {holding_id}: {new_holding.tradingsymbol}")
    return new_holding


async def delete_manual_holding(holding_id: int) -> bool:
     # ... (Keep existing delete function) ...
    if holding_id in manual_holdings_db:
        del manual_holdings_db[holding_id]
        logging.info(f"Deleted manual holding ID {holding_id}")
        return True
    logging.warning(f"Attempted to delete non-existent manual holding ID {holding_id}")
    return False

# --- NEW/UPDATED FUNCTION ---
async def get_manual_holding_details() -> List[ManualHoldingDetails]:
    """Retrieves manual holdings and fetches current price/value using yfinance."""
    # Get the base holdings from storage
    holdings = list(manual_holdings_db.values())
    if not holdings:
        return []

    logging.info(f"Processing details for {len(holdings)} manual holdings...")
    processed_holdings: List[ManualHoldingDetails] = []

    # --- Fetch current prices concurrently (using yfinance via fundamentals service) ---
    price_tasks = []
    for holding in holdings:
        # yfinance uses ticker directly for US stocks. Exchange isn't strictly needed for price lookup usually.
        # We use get_stock_fundamentals which fetches the .info dict
        task = asyncio.create_task(get_current_price_yfinance(holding.tradingsymbol, holding.exchange or 'US'))
        price_tasks.append(task)
# get_current_price_yfinance
    # Wait for all fetch tasks to complete, collecting results or exceptions
    results = await asyncio.gather(*price_tasks, return_exceptions=True)
    
    # --- Process results and calculate values ---
    for i, holding in enumerate(holdings):
        result = results[i]
        print(result)
        current_price = None
        current_value = None
        pnl = None

        if isinstance(result, Exception) or result is None:
            logging.error(f"Failed to fetch fundamentals/price for manual holding {holding.tradingsymbol}: {result}")
            # Keep current_price as None
        else:
            # Extract price from fundamentals .info dictionary
            # Check common keys for price information
            price_found = result
            if price_found is not None:
                try:
                    current_price = float(price_found)
                    logging.debug(f"Price found for {holding.tradingsymbol}: {current_price}")
                except (ValueError, TypeError) as price_err:
                     logging.error(f"Invalid price format received for {holding.tradingsymbol}: {price_found} - Error: {price_err}")
                     current_price = None # Treat as if price wasn't found
            else:
                 logging.warning(f"Could not find currentPrice or regularMarketPrice in yfinance info for {holding.tradingsymbol}")


        # Calculate current value and P&L if price was found
        if current_price is not None:
            try:
                current_value = holding.quantity * current_price
                pnl = current_value - holding.invested_amount_usd
            except TypeError as calc_err:
                 logging.error(f"Calculation error for {holding.tradingsymbol} (Qty: {holding.quantity}, Price: {current_price}): {calc_err}")
                 current_value = None
                 pnl = None

        # Create the detailed object including calculated values
        processed_holdings.append(
            ManualHoldingDetails(
                **holding.dict(), # Get base data from ManualHoldingDisplay (id, symbol, qty, avg_price, invested)
                last_price_usd=current_price, # Can be None
                current_value_usd=round(current_value, 2) if current_value is not None else None,
                pnl_usd=round(pnl, 2) if pnl is not None else None
            )
        )

    logging.info("Finished processing manual holding details.")
    return processed_holdings


async def update_manual_holding(holding_id: int, update_data: ManualHoldingUpdate) -> Optional[ManualHoldingDisplay]:
    """Updates an existing manual holding."""
    if holding_id in manual_holdings_db:
        existing_holding = manual_holdings_db[holding_id]

        # Update allowed fields from the update_data model
        existing_holding.quantity = update_data.quantity
        existing_holding.average_price_usd = update_data.average_price_usd
        if update_data.exchange is not None: # Only update exchange if provided
             existing_holding.exchange = update_data.exchange

        # Recalculate invested amount
        existing_holding.invested_amount_usd = round(
            existing_holding.quantity * existing_holding.average_price_usd, 2
        )

        # Store the updated object back (optional for in-memory, crucial for DB)
        manual_holdings_db[holding_id] = existing_holding

        logging.info(f"Updated manual holding ID {holding_id}: {existing_holding.tradingsymbol}")
        return existing_holding
    else:
        logging.warning(f"Attempted to update non-existent manual holding ID {holding_id}")
        return None # Indicate not found
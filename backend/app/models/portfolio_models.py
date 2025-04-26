from pydantic import BaseModel, Field
from typing import Optional

# --- Existing Zerodha Model (Example) ---
class PortfolioItem(BaseModel):
    tradingsymbol: str
    exchange: str
    quantity: int
    average_price: float
    invested_amount: float
    last_price: Optional[float] = None
    current_value: float
    pnl: float
    instrument_token: int

# --- Models for Manual USD Holdings ---
class ManualHoldingBase(BaseModel):
    tradingsymbol: str = Field(..., description="US Stock Ticker (e.g., AAPL, GOOGL)")
    exchange: Optional[str] = Field(None, description="Exchange (e.g., NASDAQ, NYSE)") # Optional but helpful
    quantity: float = Field(..., gt=0, description="Number of shares")
    average_price_usd: float = Field(..., gt=0, description="Average purchase price per share in USD")

class ManualHoldingCreate(ManualHoldingBase):
    pass # No extra fields needed for creation

class ManualHoldingDisplay(ManualHoldingBase):
    id: int # Add an ID for identification
    invested_amount_usd: float

# Model for display including calculated current value/pnl
class ManualHoldingDetails(ManualHoldingDisplay):
     last_price_usd: Optional[float] = None
     current_value_usd: Optional[float] = None
     pnl_usd: Optional[float] = None
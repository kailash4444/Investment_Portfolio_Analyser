from typing import Optional
from sqlmodel import Field, SQLModel # Import SQLModel components

# Keep PortfolioItem if needed for Zerodha data (not a DB table here)
class PortfolioItem(SQLModel): # Use SQLModel if you might store it later
    # ... fields ...
    pass

# --- Manual Holding Model for Database ---
# Define it as a table model
class ManualHolding(SQLModel, table=True):
    # Use Optional[int] for primary key, Field default=None for auto-increment
    id: Optional[int] = Field(default=None, primary_key=True)
    tradingsymbol: str = Field(index=True) # Add index for faster lookups
    exchange: Optional[str] = Field(default=None)
    quantity: float
    average_price_usd: float
    # Calculate invested amount on the fly or store redundantly if preferred
    # For this example, we won't store invested_amount in the table

    # Relationship definitions if linking to other tables would go here

# Pydantic models for API input/output (can reuse parts of SQLModel)
class ManualHoldingCreate(SQLModel): # Inherit from SQLModel for auto-validation
     tradingsymbol: str
     exchange: Optional[str] = None
     quantity: float
     average_price_usd: float

class ManualHoldingUpdate(SQLModel):
     quantity: float
     average_price_usd: float
     exchange: Optional[str] = None

class ManualHoldingRead(SQLModel): # For basic reads without price/pnl
     id: int
     tradingsymbol: str
     exchange: Optional[str]
     quantity: float
     average_price_usd: float
     invested_amount_usd: float # Calculate this when reading

class ManualHoldingDetails(ManualHoldingRead): # For detailed reads
     last_price_usd: Optional[float] = None
     current_value_usd: Optional[float] = None
     pnl_usd: Optional[float] = None
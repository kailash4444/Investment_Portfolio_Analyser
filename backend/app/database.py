from sqlmodel import create_engine, Session, SQLModel
from .core import config # Assuming you store DB URL in config/env

# Define database URL (SQLite in this case)
DATABASE_FILE = "manual_portfolio.db"
DATABASE_URL = f"sqlite:///{DATABASE_FILE}"
# Example for PostgreSQL (requires defining DB_USER, DB_PASS etc in config):
# DATABASE_URL = f"postgresql+asyncpg://{config.DB_USER}:{config.DB_PASS}@{config.DB_HOST}:{config.DB_PORT}/{config.DB_NAME}"

# `echo=True` logs SQL statements, useful for debugging
# Use connect_args for SQLite specific settings
engine = create_engine(DATABASE_URL, echo=True, connect_args={"check_same_thread": False})
# For async PostgreSQL:
# from sqlalchemy.ext.asyncio import create_async_engine
# engine = create_async_engine(DATABASE_URL, echo=True)

def create_db_and_tables():
    # Creates tables based on SQLModels that inherit from table=True
    SQLModel.metadata.create_all(engine)

# Dependency for getting a session in API endpoints
def get_session():
    with Session(engine) as session:
        yield session
# For async:
# from sqlmodel.ext.asyncio.session import AsyncSession
# async def get_session():
#     async with AsyncSession(engine) as session:
#         yield session
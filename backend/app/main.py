from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from kiteconnect import KiteConnect
from .core.config import API_KEY # Import API_KEY directly
from .routers import portfolio, auth,history # , history, news # Import auth
import logging
# from .routers import portfolio, auth # , history, news # Import auth


app = FastAPI(title='investment')

origins = ['http://localhost:5173','http://127.0.0.1/5173']

app.add_middleware(CORSMiddleware,allow_origins = origins,allow_credentials = True,allow_headers=['*'],allow_methods = ['*'])




@app.get("/")
async def read_root():
    return {"message": "Welcome to the Investment Portfolio API! Backend is running."}

# # --- Include Routers ---
app.include_router(auth.router) # Add the auth router
app.include_router(portfolio.router) # Prefix defined in the router file
app.include_router(history.router) 
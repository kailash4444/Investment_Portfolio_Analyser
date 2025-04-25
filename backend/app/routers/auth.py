# backend/app/routers/auth.py
from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import RedirectResponse
from kiteconnect import KiteConnect
from ..core import config
import logging
from ..services import zerodha_services # Import the service

router = APIRouter(
    prefix="/auth/zerodha",
    tags=["authentication"]
)

@router.get("/login")
async def zerodha_login():
    """
    Initiates the Zerodha login flow by redirecting the user.
    """
    try:
        # No need for access token here, just the API key
        kite = KiteConnect(api_key=config.API_KEY)
        login_url = kite.login_url()
        logging.info(f"Redirecting user to Zerodha login: {login_url}")
        # Redirect the user's browser to Zerodha's login page
        return RedirectResponse(url=login_url)
    except Exception as e:
        logging.error(f"Error generating Zerodha login URL: {e}")
        raise HTTPException(status_code=500, detail="Could not initiate Zerodha login.")

@router.get("/callback")
async def zerodha_callback(request: Request):
    """
    Callback endpoint that Zerodha redirects to after user login.
    Handles the request token and exchanges it for an access token.
    """
    request_token = request.query_params.get("request_token")

    status = request.query_params.get("status")

    print("request_token:",request_token,"status:",status)
    if status != "success" or not request_token:
        logging.error(f"Zerodha callback failed. Status: {status}, Request Token: {request_token}")
        # Redirect to a failure page on the frontend?
        error_url = f"{config.FRONTEND_URL}/login-failed?reason=callback_error"
        return RedirectResponse(url=error_url)

    logging.info(f"Received successful Zerodha callback with request_token: {request_token[:5]}...")

    try:
        # Initialize KiteConnect only with API key for session generation
        kite = KiteConnect(api_key=config.API_KEY)
        # Exchange request token for access token
        session = kite.generate_session(request_token, api_secret=config.API_SECRET)
        access_token = session["access_token"]
        logging.info("Successfully generated access token.")

        # --- Store the access token in the service ---
        zerodha_services.update_access_token(access_token)
        # --- Token is now stored in memory ---

        # Redirect user back to the frontend dashboard
        logging.info(f"Redirecting user back to frontend: {config.FRONTEND_URL}/dashboard")
        return RedirectResponse(url=f"{config.FRONTEND_URL}/dashboard?status=connected") # Add status param

    except Exception as e:
        logging.error(f"Error generating session from request token: {e}")
        # Redirect to a failure page on the frontend?
        error_url = f"{config.FRONTEND_URL}/login-failed?reason=token_exchange_error"
        return RedirectResponse(url=error_url)

@router.get("/status")
async def get_auth_status():
    """
    Simple endpoint for the frontend to check if the backend thinks it's connected.
    """
    is_connected = zerodha_services.get_connection_status()
    print(is_connected)
    return {"connected": is_connected}
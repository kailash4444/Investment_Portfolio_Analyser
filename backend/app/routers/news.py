# backend/app/routers/news.py
from fastapi import APIRouter, HTTPException
from ..services import news_service # Import the news service
import logging

router = APIRouter(
    prefix="/api/v1/news",
    tags=["Stock News"],
    responses={404: {"description": "Not found"}},
)

@router.get("/{stock_name}",
            summary="Get Summarized News for a Stock",
            response_description="A concise summary of recent news related to the stock.")
async def get_stock_news_endpoint(stock_name: str):
    """
    Provides an AI-generated summary of recent news for the given stock name.
    """
    if not stock_name:
        raise HTTPException(status_code=400, detail="Stock name cannot be empty.")

    logging.info(f"Received news summary request for: {stock_name}")
    try:
        summary = await news_service.get_news(stock_name)
        if summary is None:
             # This case should ideally be handled within the service returning a string,
             # but added as a safeguard.
             raise HTTPException(status_code=503, detail="News service unavailable.")

        # Return summary, even if it's an error message from the service
        print(summary)
        return {"summary": summary}

    except Exception as e:
         # Catch unexpected errors in the endpoint itself
        logging.exception(f"Unexpected error in news endpoint for {stock_name}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error processing news request.")
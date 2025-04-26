import logging
import asyncio
from ..core import config # Import your config module
from google import genai
from google.genai.types import Tool, GenerateContentConfig, GoogleSearch

client = genai.Client(api_key = config.GEMINI_API_KEY)
model_id = "gemini-2.0-flash"

google_search_tool = Tool(
    google_search = GoogleSearch()
)


def get_response(stock: str) -> str:

    response = client.models.generate_content(
            model=model_id,
            contents=f"What is the latest news about the company {stock} that might affect its stock price? This news should not be related stock price prediction, but rather the latest news about the company.",
            config=GenerateContentConfig(
                tools=[google_search_tool],
                response_modalities=["TEXT"],
            )
        )

    return response.candidates[0].content.parts[0].text


async def get_news(stock: str) -> str:
    """Fetches news based on the query using the LLM."""
    try:
        
        # Use the agent executor to get the response
        response = await asyncio.to_thread(get_response,stock)
        return response
    except Exception as e:
        logging.error(f"Error fetching news: {e}")
        return "Error fetching news."
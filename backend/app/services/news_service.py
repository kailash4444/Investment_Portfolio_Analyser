import logging
import asyncio
from ..core import config # Import your config module
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.prompts import HumanMessagePromptTemplate, SystemMessagePromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.tools import tool
import os
from langchain_community.tools import DuckDuckGoSearchRun
from langchain.agents import create_tool_calling_agent, AgentExecutor

@tool
def search_tool(query: str) -> str:
    """Searches the web for the given query."""
    search = DuckDuckGoSearchRun()
    result = search.invoke(query)
    return result


os.environ["GOOGLE_API_KEY"] = config.GEMINI_API_KEY

llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash")

tools = [search_tool]
# response = chain.invoke("What is the latest news about the NVIDIA stock market?")
prompt = ChatPromptTemplate.from_messages(
        [
        ("system", "You are a helpful assistant"),
        ("human", "What is the latest news about the {stock} stock market today?"),("placeholder", "{agent_scratchpad}"),    ]
        )
agent = create_tool_calling_agent(llm, tools, prompt)
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=False)



async def get_news(stock: str) -> str:
    """Fetches news based on the query using the LLM."""
    try:
        
        # Use the agent executor to get the response
        response = await asyncio.to_thread(agent_executor.invoke, {"stock": stock})
        print(response)
        return response['output']
    except Exception as e:
        logging.error(f"Error fetching news: {e}")
        return "Error fetching news."
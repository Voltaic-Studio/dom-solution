
import os
import asyncio
from langchain_openai import ChatOpenAI
from browser_use import Agent

# Initialize LLM via OpenRouter
# Ensure OPENAI_API_KEY and OPENAI_BASE_URL (https://openrouter.ai/api/v1) are set in env
llm = ChatOpenAI(
    model="google/gemini-2.0-flash-001", # OpenRouter model ID
    api_key=os.getenv("OPENAI_API_KEY"),
    base_url=os.getenv("OPENAI_BASE_URL", "https://openrouter.ai/api/v1"),
)

async def main():
    agent = Agent(
        task="Solve the 30-step browser challenge at https://serene-frangipane-7fd25b.netlify.app. Start by clicking 'START'. For each step: 1. Close any popups/overlays first. 2. Follow instructions (enter code, select option, scroll). 3. Click Next/Submit. If a code is visible (e.g. X9K2J1), type it into the input.",
        llm=llm,
        use_vision=True, # Critical for this challenge
    )
    
    result = await agent.run()
    print(result)

if __name__ == "__main__":
    asyncio.run(main())

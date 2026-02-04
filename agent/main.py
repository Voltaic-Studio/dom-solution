import os
import asyncio
from browser_use import Agent, Browser, ChatOpenAI

async def main():
    llm = ChatOpenAI(
        model="openai/gpt-4o",
        api_key=os.getenv("OPENROUTER_API_KEY"),
        base_url="https://openrouter.ai/api/v1",
    )
    
    browser = Browser()
    
    agent = Agent(
        task="Solve the 30-step browser challenge at https://serene-frangipane-7fd25b.netlify.app. Start by clicking 'START'. For each step: 1. Close any popups/overlays first. 2. Follow instructions (enter code, select option, scroll). 3. Click Next/Submit. If a code is visible (e.g. X9K2J1), type it into the input.",
        llm=llm,
        browser=browser,
        use_vision=True,
        max_actions_per_step=5,  # Allow batching multiple actions (e.g., close 5 modals at once)
    )
    
    result = await agent.run()
    print(result)

if __name__ == "__main__":
    asyncio.run(main())

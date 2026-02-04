
import os
import asyncio
from langchain_openai import ChatOpenAI
from browser_use import Agent, Browser
from playwright.async_api import async_playwright

# Import our custom optimization layer
# We need to manually initialize Playwright here to pass the page to our controller
from src.controller import get_controller

async def main():
    api_key = os.getenv("OPENROUTER_API_KEY") or os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("Missing OPENROUTER_API_KEY")

    # 1. Initialize Model (OpenRouter)
    llm = ChatOpenAI(
        model="openai/gpt-4o", 
        api_key=api_key,
        base_url="https://openrouter.ai/api/v1",
        temperature=0, # Deterministic for speed
    )
    
    # 2. Initialize Browser (Standard)
    # We use a persistent context to be safe
    browser = Browser(
        config={
            "headless": False, 
            "disable_security": True
        }
    )
    
    # 3. Custom Controller Hook
    # We want to inject our Semantic Locator into the agent
    async with await browser.new_context() as context:
        page = await context.get_current_page()
        controller = get_controller(page)

        agent = Agent(
            task="""
            Solve the browser challenge at https://serene-frangipane-7fd25b.netlify.app. 
            
            STRATEGY:
            1. Use 'fast_click' for obvious buttons like "Start", "Next", "Submit", "Close".
            2. Use 'fast_fill' for code inputs if you see the code.
            3. Only use standard VLM actions if fast actions fail.
            4. Goal: Speed.
            """,
            llm=llm,
            browser_context=context,
            controller=controller, # Inject our Fast Hands
            use_vision=True,
        )
        
        print("🚀 Agent Starting (Hybrid Architecture)")
        result = await agent.run()
        print(result)

    await browser.close()

if __name__ == "__main__":
    asyncio.run(main())

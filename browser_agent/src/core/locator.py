
import asyncio
from typing import Optional
from playwright.async_api import Page, Locator

class SemanticLocator:
    """
    Fast, heuristic-based element finder to speed up VLM grounding.
    It doesn't replace the VLM, it acts as a 'fast hand' for the brain.
    """
    def __init__(self, page: Page):
        self.page = page

    async def find_element_by_description(self, description: str) -> Optional[Locator]:
        """
        Finds an element using generalized heuristics (text match, aria-label, etc.)
        This avoids the round-trip latency of VLM coordinate prediction for obvious elements.
        """
        description = description.lower()
        
        # 1. Text Exact Match (Fastest)
        try:
            # Prioritize buttons and links
            loc = self.page.locator(f"button:text-is('{description}'), a:text-is('{description}')").first
            if await loc.count() > 0 and await loc.is_visible():
                return loc
        except: pass

        # 2. Text Contains (Broader)
        try:
            loc = self.page.locator(f"text={description}").first
            if await loc.count() > 0 and await loc.is_visible():
                return loc
        except: pass
        
        # 3. Form Input Heuristics (for "Code Input", "Email", etc.)
        if "input" in description or "code" in description:
            try:
                # Common patterns for inputs
                locs = [
                    "input[placeholder*='code' i]", 
                    "input[name*='code' i]",
                    "input:not([type='hidden'])"
                ]
                for s in locs:
                    loc = self.page.locator(s).first
                    if await loc.count() > 0 and await loc.is_visible():
                        return loc
            except: pass

        return None

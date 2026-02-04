
from browser_use import ActionModel, Controller
from playwright.async_api import Page
from .core.locator import SemanticLocator

# Define Custom Actions
class FastActions(ActionModel):
    """
    Custom actions that bypass the VLM coordinate prediction for speed.
    """
    def click_text(self, text: str):
        """Click an element containing specific text"""
        return {"text": text}

    def fill_input(self, description: str, value: str):
        """Fill an input field matching description"""
        return {"description": description, "value": value}

# Controller Implementation
def get_controller(page: Page):
    controller = Controller()
    locator = SemanticLocator(page)

    @controller.action("Click element by text (Fast)", param_model=FastActions)
    async def fast_click(text: str):
        print(f"⚡ Fast Click: {text}")
        el = await locator.find_element_by_description(text)
        if el:
            await el.click()
            return True
        return False # Fallback to VLM

    @controller.action("Fill input (Fast)", param_model=FastActions)
    async def fast_fill(description: str, value: str):
        print(f"⚡ Fast Fill: {description} -> {value}")
        el = await locator.find_element_by_description(description)
        if el:
            await el.fill(value)
            return True
        return False

    return controller

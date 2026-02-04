
import { chromium, Page, Browser } from 'playwright';

export class BrowserManager {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async init(headless = false) {
    this.browser = await chromium.launch({
      headless,
      args: ['--disable-gpu', '--no-sandbox', '--disable-blink-features=AutomationControlled'],
    });
    this.page = await this.browser.newPage({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    // Stealth: Remove webdriver property
    await this.page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    return this.page;
  }

  async getSnapshot() {
    if (!this.page) throw new Error("Browser not initialized");
    
    const screenshot = await this.page.screenshot({ type: 'jpeg', quality: 60 });
    
    // Simplified DOM for LLM (removes clutter)
    const dom = await this.page.evaluate(() => {
      // Logic to strip script/style and return clean structure
      // For now returning simplified body text/structure
      return document.body.innerText.slice(0, 5000); 
    });

    return { screenshot, dom };
  }

  async close() {
    await this.browser?.close();
  }
}

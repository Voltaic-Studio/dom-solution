
import { chromium, Browser, Page } from 'playwright';

export class BrowserManager {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async init(headless: boolean = false) {
    this.browser = await chromium.launch({ headless });
    this.page = await this.browser.newPage();
    return this.page;
  }

  async close() {
    await this.browser?.close();
  }

  getPage() {
    if (!this.page) throw new Error("Browser not initialized");
    return this.page;
  }
}

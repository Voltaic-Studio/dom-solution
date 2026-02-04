/**
 * Browser Manager - Handles Playwright with stealth
 */

import { chromium, Page, Browser } from 'playwright';

export interface Snapshot {
  screenshot: Buffer;
  dom: string;
  url: string;
  interactiveElements: string;
}

export class BrowserManager {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async init(headless = false): Promise<Page> {
    this.browser = await chromium.launch({
      headless,
      args: ['--disable-gpu', '--no-sandbox', '--disable-blink-features=AutomationControlled'],
    });
    
    this.page = await this.browser.newPage({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });
    
    // Stealth
    await this.page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    // Auto-dismiss dialogs
    this.page.on('dialog', d => d.accept().catch(() => {}));

    return this.page;
  }

  getPage(): Page {
    if (!this.page) throw new Error("Browser not initialized");
    return this.page;
  }

  async getSnapshot(): Promise<Snapshot> {
    if (!this.page) throw new Error("Browser not initialized");
    
    const screenshot = await this.page.screenshot({ type: 'jpeg', quality: 70 });
    
    // Get structured DOM info for grounding
    const { dom, interactiveElements } = await this.page.evaluate(() => {
      // Get all interactive elements with their positions
      const interactive: string[] = [];
      
      // Buttons
      document.querySelectorAll('button').forEach((el, i) => {
        const text = el.textContent?.trim().slice(0, 50) || '';
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          interactive.push(`button[${i}]: "${text}" at (${Math.round(rect.x)},${Math.round(rect.y)})`);
        }
      });
      
      // Inputs
      document.querySelectorAll('input:not([type="hidden"])').forEach((el, i) => {
        const input = el as HTMLInputElement;
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          interactive.push(`input[${i}]: type="${input.type}" placeholder="${input.placeholder || ''}" at (${Math.round(rect.x)},${Math.round(rect.y)})`);
        }
      });
      
      // Links
      document.querySelectorAll('a[href]').forEach((el, i) => {
        const text = el.textContent?.trim().slice(0, 30) || '';
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && text) {
          interactive.push(`link[${i}]: "${text}"`);
        }
      });

      // Get visible text (simplified)
      const visibleText = document.body.innerText.slice(0, 2000);
      
      return {
        dom: visibleText,
        interactiveElements: interactive.join('\n')
      };
    });

    return {
      screenshot,
      dom,
      url: this.page.url(),
      interactiveElements
    };
  }

  // Execute actions
  async click(selector: string): Promise<boolean> {
    if (!this.page) return false;
    try {
      await this.page.click(selector, { timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  async clickText(text: string): Promise<boolean> {
    if (!this.page) return false;
    try {
      await this.page.click(`text="${text}"`, { timeout: 3000 });
      return true;
    } catch {
      try {
        // Fallback: partial match
        await this.page.click(`text=${text}`, { timeout: 2000 });
        return true;
      } catch {
        return false;
      }
    }
  }

  async type(selector: string, text: string): Promise<boolean> {
    if (!this.page) return false;
    try {
      await this.page.fill(selector, text, { timeout: 3000 });
      return true;
    } catch {
      try {
        // Fallback: click and type
        await this.page.click(selector, { timeout: 2000 });
        await this.page.keyboard.type(text);
        return true;
      } catch {
        return false;
      }
    }
  }

  async typeIntoVisible(text: string): Promise<boolean> {
    if (!this.page) return false;
    try {
      // Find first visible input
      const input = await this.page.$('input:visible:not([type="hidden"])');
      if (input) {
        await input.fill(text);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async scroll(direction: 'up' | 'down', amount = 500): Promise<void> {
    if (!this.page) return;
    const delta = direction === 'down' ? amount : -amount;
    await this.page.evaluate((d) => window.scrollBy(0, d), delta);
  }

  async wait(ms: number): Promise<void> {
    if (!this.page) return;
    await this.page.waitForTimeout(ms);
  }

  async close(): Promise<void> {
    await this.browser?.close();
    this.browser = null;
    this.page = null;
  }
}

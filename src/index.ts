
import { BrowserManager } from './core/browser.js';
import { MetricsCollector } from './core/metrics.js';
import type { Page } from 'playwright';

async function main() {
  console.log("🚀 DOM Agent - SMART SOLVER MODE");
  
  const metrics = new MetricsCollector();
  const browser = new BrowserManager();
  
  metrics.startRun();
  const page = await browser.init(false);

  // Inject the Smart Solver Engine
  await page.addInitScript(() => {
    // Zero-delay overrides
    // @ts-ignore
    window.originalSetTimeout = window.setTimeout;
    // @ts-ignore
    window.setTimeout = (fn, ms) => window.originalSetTimeout(fn, 0); 
    
    // @ts-ignore
    window.solver = {
      active: true,
      level: 0,
      
      start: function() {
        console.log('Smart Solver started');
        this.loop();
      },

      loop: async function() {
        if (!this.active) return;

        // 1. POPUP DEFENSE
        // Click anything that looks like a close button on top
        const closers = Array.from(document.querySelectorAll('button, div[role="button"]'))
          .filter(el => {
            const text = (el.textContent || '').trim().toLowerCase();
            return ['close', 'dismiss', 'x', 'no thanks', 'cancel'].includes(text) && 
                   el.checkVisibility(); 
          });
        
        for (const btn of closers) {
          (btn as HTMLElement).click();
        }

        // 2. SCROLL TRIGGER
        window.scrollTo(0, document.body.scrollHeight);
        
        // 3. CODE EXTRACTION
        // Look for the secret code pattern (6 chars, uppercase alphanumeric)
        // Usually near "Scroll to Reveal" or inside a specific container
        const bodyText = document.body.innerText;
        const codeMatch = bodyText.match(/\b[A-Z0-9]{6}\b/);
        const code = codeMatch ? codeMatch[0] : null;

        // 4. INPUT HANDLING
        const input = document.querySelector('input[type="text"], input:not([type])') as HTMLInputElement;
        
        if (input && code && input.value !== code) {
          // Found input + code -> Solve it
          input.value = code;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          
          // Find the submit button specifically for this
          const submitBtn = Array.from(document.querySelectorAll('button'))
            .find(b => (b.textContent || '').toLowerCase().includes('submit'));
            
          if (submitBtn) {
            submitBtn.click();
            this.log(`Solved with code: ${code}`);
            return this.nextTick();
          }
        }

        // 5. GENERIC NAVIGATION (If no code puzzle)
        const nextKeywords = ['next', 'proceed', 'continue', 'level', 'start', 'advance', 'go forward'];
        const buttons = Array.from(document.querySelectorAll('button, a'))
          .filter(el => {
             const t = (el.textContent || '').toLowerCase();
             return nextKeywords.some(k => t.includes(k)) && el.checkVisibility();
          });

        if (buttons.length > 0) {
          // Prioritize "Next" over others
          const best = buttons.find(b => b.textContent?.toLowerCase().trim() === 'next') || buttons[0];
          (best as HTMLElement).click();
        }

        this.nextTick();
      },

      nextTick: function() {
        // @ts-ignore
        window.originalSetTimeout(() => this.loop(), 50); // 20 ticks/sec
      },

      log: function(msg: string) {
        console.log(`[Solver] ${msg}`);
      }
    };
  });

  console.log("🌍 Navigating...");
  await page.goto('https://serene-frangipane-7fd25b.netlify.app', { waitUntil: 'domcontentloaded' });

  console.log("⚡ Injecting Logic...");
  await page.evaluate(() => {
    // @ts-ignore
    if (window.solver) window.solver.start();
  });

  // Monitor Loop
  const startTime = Date.now();
  let currentLevel = 0;

  while (Date.now() - startTime < 60000) { // 60s timeout
    const level = await page.evaluate(() => {
      const match = document.body.innerText.match(/Step (\d+)/) || document.body.innerText.match(/Level (\d+)/);
      return match ? parseInt(match[1]) : 0;
    });

    if (level > currentLevel) {
      console.log(`✅ Level ${level} reached (${Date.now() - startTime}ms)`);
      currentLevel = level;
      if (level === 30) break;
    }
    
    await page.waitForTimeout(200);
  }

  console.log(`🏁 Finished at Level ${currentLevel}`);
  metrics.endRun();
  await browser.close();
}

main().catch(console.error);

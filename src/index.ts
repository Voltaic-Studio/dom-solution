
import { BrowserManager } from './core/browser.js';
import { MetricsCollector } from './core/metrics.js';
import type { Page } from 'playwright';

async function main() {
  console.log("🚀 DOM Agent - ULTRA SPEED MODE");
  
  const metrics = new MetricsCollector();
  const browser = new BrowserManager();
  
  metrics.startRun();
  const page = await browser.init(false);

  // 1. Inject High-Performance Solver Bundle
  await page.addInitScript(() => {
    // A. Time Warp (Kill all delays)
    // @ts-ignore
    window.originalSetTimeout = window.setTimeout;
    // @ts-ignore
    window.setTimeout = (fn, ms) => window.originalSetTimeout(fn, 0); // Force 0ms
    
    // @ts-ignore
    window.originalRAF = window.requestAnimationFrame;
    // @ts-ignore
    window.requestAnimationFrame = (cb) => window.originalRAF(() => cb(performance.now() + 1000)); // Future time

    // B. CSS Nuke (No layout shifts/anim)
    const style = document.createElement('style');
    style.innerHTML = `* { transition: none !important; animation: none !important; }`;
    document.head.appendChild(style);

    // C. The Solver Engine (Runs entirely in browser)
    // @ts-ignore
    window.solver = {
      active: true,
      level: 0,
      history: [],
      
      start: function() {
        console.log('Solver started');
        this.loop();
      },

      loop: function() {
        if (!this.active) return;

        // 1. Identify "Next" / Actionable Elements
        // Priority: Buttons, Inputs, Links
        const candidates = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], a[href], div[role="button"]'))
          .filter(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && !(el as any).disabled;
          });

        // 2. Filter for "Forward" intent
        // (If multiple buttons exist, pick the one that looks like "Next", "Submit", "Go")
        const keywords = ['start', 'next', 'continue', 'submit', 'verify', 'check', 'go', 'solve', 'level'];
        
        let target = candidates.find(el => {
          const text = (el.textContent || (el as any).value || '').toLowerCase();
          return keywords.some(k => text.includes(k));
        });

        // Fallback: Just click the first visible button if no keyword match
        if (!target && candidates.length > 0) target = candidates[0];

        if (target) {
          // 3. EXECUTE (Native Event Dispatch for speed)
          // Some React apps need full event chain
          ['mousedown', 'mouseup', 'click'].forEach(eventType => {
            const evt = new MouseEvent(eventType, { bubbles: true, cancelable: true, view: window });
            target!.dispatchEvent(evt);
          });
          
          this.history.push({ level: this.level, action: 'click', target: target.tagName });
        }

        // 4. Cheat/Hack: Look for exposed level variable
        // @ts-ignore
        if (window.level && window.level > this.level) {
           this.level = window.level;
           console.log(`Level advanced to ${this.level}`);
        }

        // Loop immediately (microtask)
        // @ts-ignore
        window.originalSetTimeout(() => this.loop(), 0);
      }
    };
  });

  console.log("🌍 Navigating...");
  await page.goto('https://serene-frangipane-7fd25b.netlify.app', { waitUntil: 'domcontentloaded' });

  // Start the internal engine
  console.log("⚡ Injecting Solver...");
  await page.evaluate(() => {
    // @ts-ignore
    if (window.solver) window.solver.start();
  });

  // Monitor progress from Node side
  const startTime = Date.now();
  let currentLevel = 0;

  while (Date.now() - startTime < 10000) { // 10s timeout
    const level = await page.evaluate(() => {
      // @ts-ignore
      return window.level || parseInt(document.body.innerText.match(/Level (\d+)/)?.[1] || "0");
    });

    if (level > currentLevel) {
      console.log(`✅ Level ${level} reached (${Date.now() - startTime}ms)`);
      currentLevel = level;
      if (level === 30) break;
    }
    
    await page.waitForTimeout(100);
  }

  console.log(`🏁 Done. Reached Level ${currentLevel}`);
  metrics.endRun();
  await browser.close();
}

main().catch(console.error);

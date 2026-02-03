import { BrowserManager } from './core/browser.js';
import { MetricsCollector } from './core/metrics.js';
import type { Page } from 'playwright';

async function setupSpeedHacks(page: Page): Promise<void> {
  // Inject speed hacks BEFORE page loads
  await page.addInitScript(() => {
    // Speed up all timers 100x
    const originalSetTimeout = window.setTimeout;
    const originalSetInterval = window.setInterval;
    
    // @ts-ignore
    window.setTimeout = (fn: Function, delay?: number, ...args: any[]) => {
      return originalSetTimeout(fn, Math.min(delay || 0, 1), ...args);
    };
    
    // @ts-ignore
    window.setInterval = (fn: Function, delay?: number, ...args: any[]) => {
      return originalSetInterval(fn, Math.min(delay || 0, 1), ...args);
    };

    // Kill all animations
    const style = document.createElement('style');
    style.textContent = `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `;
    document.head.appendChild(style);

    // Speed up requestAnimationFrame
    const originalRAF = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback: FrameRequestCallback) => {
      return originalRAF(() => {
        callback(performance.now());
      });
    };
  });
}

async function injectAnimationKiller(page: Page): Promise<void> {
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.id = 'speed-hack';
    style.textContent = `
      *, *::before, *::after {
        animation: none !important;
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition: none !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `;
    if (!document.getElementById('speed-hack')) {
      document.head.appendChild(style);
    }
  });
}

async function getGameState(page: Page): Promise<any> {
  // Try to extract any game state from window/global scope
  return await page.evaluate(() => {
    const win = window as any;
    return {
      // Look for common game state patterns
      level: win.level || win.currentLevel || win.gameState?.level,
      state: win.state || win.gameState,
      app: win.app,
      game: win.game,
      // Get all global variables that might be game-related
      globals: Object.keys(win).filter(k => 
        !k.startsWith('webkit') && 
        !k.startsWith('on') &&
        typeof win[k] !== 'function'
      ).slice(0, 20)
    };
  });
}

async function solveLevel(page: Page): Promise<boolean> {
  // Direct DOM manipulation - find and trigger all interactive elements
  return await page.evaluate(() => {
    let clicked = false;
    
    // Find all clickable elements
    const clickables = document.querySelectorAll(
      'button, a, input[type="button"], input[type="submit"], [role="button"], [onclick], .btn, .button, [tabindex]'
    );
    
    // Priority keywords
    const priority = ['start', 'next', 'continue', 'ok', 'yes', 'submit', 'confirm', 'accept', 'close', 'done', 'go', 'click', 'play'];
    
    // Sort by priority
    const sorted = Array.from(clickables).sort((a, b) => {
      const aText = (a.textContent || '').toLowerCase();
      const bText = (b.textContent || '').toLowerCase();
      const aPriority = priority.findIndex(p => aText.includes(p));
      const bPriority = priority.findIndex(p => bText.includes(p));
      return (aPriority === -1 ? 999 : aPriority) - (bPriority === -1 ? 999 : bPriority);
    });

    // Click the best candidate
    for (const el of sorted) {
      const rect = el.getBoundingClientRect();
      const isVisible = rect.width > 0 && rect.height > 0 && 
        getComputedStyle(el).visibility !== 'hidden' &&
        getComputedStyle(el).display !== 'none';
      
      if (isVisible) {
        (el as HTMLElement).click();
        // Also dispatch events directly
        el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        clicked = true;
        break;
      }
    }

    // If nothing found, try clicking any visible element
    if (!clicked) {
      const all = document.querySelectorAll('*');
      for (const el of all) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && (el as HTMLElement).onclick) {
          (el as HTMLElement).click();
          clicked = true;
          break;
        }
      }
    }

    return clicked;
  });
}

async function getCurrentLevel(page: Page): Promise<number> {
  return await page.evaluate(() => {
    const text = document.body.innerText;
    // Try various patterns
    const patterns = [
      /level\s*[:\s]*(\d+)/i,
      /(\d+)\s*\/\s*30/,
      /stage\s*[:\s]*(\d+)/i,
      /puzzle\s*[:\s]*(\d+)/i
    ];
    for (const p of patterns) {
      const match = text.match(p);
      if (match) return parseInt(match[1]);
    }
    return 0;
  });
}

async function main() {
  console.log("🚀 DOM Agent - TURBO MODE");
  
  const metrics = new MetricsCollector();
  const browser = new BrowserManager();
  
  metrics.startRun();
  
  const page = await browser.init(false);
  
  // Setup speed hacks BEFORE navigation
  await setupSpeedHacks(page);

  console.log("🌍 Loading challenge...");
  await page.goto('https://serene-frangipane-7fd25b.netlify.app', { waitUntil: 'domcontentloaded' });
  
  // Inject animation killer
  await injectAnimationKiller(page);

  const startTime = Date.now();
  let lastLevel = 0;
  let iterations = 0;

  console.log("⚡ SOLVING...\n");

  // Tight loop - no waiting
  while ((Date.now() - startTime) < 300000) { // 5 min max
    iterations++;
    
    // Re-inject speed hacks (in case page changed)
    if (iterations % 10 === 0) {
      await injectAnimationKiller(page);
    }

    const level = await getCurrentLevel(page);
    
    if (level > lastLevel) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ Level ${level} @ ${elapsed}s`);
      metrics.logLevel(level, Date.now() - startTime, "success", iterations);
      lastLevel = level;
      
      if (level >= 30) {
        console.log("\n🏆 ALL 30 LEVELS COMPLETE!");
        break;
      }
    }

    await solveLevel(page);
    
    // Minimal yield to let browser process
    await page.evaluate(() => new Promise(r => setTimeout(r, 0)));
  }

  const totalTime = (Date.now() - startTime) / 1000;
  console.log(`\n🏁 Finished: ${lastLevel}/30 levels in ${totalTime.toFixed(2)}s (${iterations} iterations)`);
  
  // Debug: show game state
  const state = await getGameState(page);
  console.log("Game state:", state);
  
  metrics.endRun();
  
  await page.waitForTimeout(3000);
  await browser.close();
}

main().catch(console.error);

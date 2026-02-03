
import { BrowserManager } from './core/browser.js';
import { MetricsCollector } from './core/metrics.js';

async function main() {
  console.log("🚀 DOM Agent - MULTI-AGENT ARCHITECTURE");
  
  const metrics = new MetricsCollector();
  const browser = new BrowserManager();
  
  metrics.startRun();
  const page = await browser.init(false);

  // INJECTED AGENT ARCHITECTURE
  // We run this entirely inside the browser for maximum speed (0 network latency)
  await page.addInitScript(() => {
    // Zero-delay overrides
    // @ts-ignore
    window.originalSetTimeout = window.setTimeout;
    // @ts-ignore
    window.setTimeout = (fn, ms) => window.originalSetTimeout(fn, 0); 

    // --- AGENT 1: THE JANITOR ---
    // Responsibility: Remove noise, popups, overlays, and distractions.
    class JanitorAgent {
      clean() {
        // 1. Remove Obvious Overlays/Modals (by z-index or class)
        // Heuristic: High z-index + covering screen
        const highZ = Array.from(document.querySelectorAll('*')).filter(el => {
          const style = window.getComputedStyle(el);
          return parseInt(style.zIndex) > 100 && 
                 (style.position === 'fixed' || style.position === 'absolute');
        });

        highZ.forEach(el => {
          // Check if it contains "close" button, if so, click it first (might be required logic)
          // If purely noise, remove it.
          const text = el.textContent?.toLowerCase() || '';
          if (text.includes('offer') || text.includes('subscribe') || text.includes('ad')) {
            el.remove();
          } else {
            // Try to dismiss functional popups
            const closer = el.querySelector('button, [role="button"], span');
            if (closer && (closer.textContent?.toLowerCase().includes('close') || closer.textContent?.includes('×'))) {
              (closer as HTMLElement).click();
            }
          }
        });

        // 2. Aggressive Popup Removal (Specific to known patterns)
        const popups = document.querySelectorAll('.popup, .modal, .overlay, [id*="popup"], [id*="modal"]');
        popups.forEach(el => el.remove());
      }
    }

    // --- AGENT 2: THE SOLVER ---
    // Responsibility: Understand the core state and advance.
    class SolverAgent {
      level = 0;

      solve() {
        // 1. SCROLL TRIGGER (Standard mechanic)
        window.scrollTo(0, document.body.scrollHeight);

        // 2. DATA EXTRACTION (The "Source Code" strategy)
        // Instead of visual scanning, we scan the DOM text nodes directly
        const bodyText = document.body.innerText;
        
        // Pattern: 6-char alphanumeric code (e.g., "X9J2K1")
        const codeMatch = bodyText.match(/\b[A-Z0-9]{6}\b/);
        const code = codeMatch ? codeMatch[0] : null;

        // 3. ACTION EXECUTION
        if (code) {
          this.handleCodePuzzle(code);
        } else {
          this.handleNavigation();
        }
      }

      handleCodePuzzle(code: string) {
        const input = document.querySelector('input[type="text"], input:not([type])') as HTMLInputElement;
        if (input && input.value !== code) {
          // Bypass React/Framework event listeners by firing native events
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(input, code);
          } else {
            input.value = code;
          }
          
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          
          // Find Submit specifically
          const btn = this.findButton(['submit', 'verify', 'check']);
          if (btn) btn.click();
        }
      }

      handleNavigation() {
        // Look for state-changing buttons
        const btn = this.findButton(['next', 'proceed', 'continue', 'level', 'start', 'advance']);
        if (btn) btn.click();
      }

      findButton(keywords: string[]): HTMLElement | null {
        // Priority: <button>, <input type="submit">, <a>, div[role="button"]
        const candidates = Array.from(document.querySelectorAll('button, input[type="submit"], a, div[role="button"]'));
        
        // Filter by visible text
        return candidates.find(el => {
          if (!el.checkVisibility()) return false;
          const text = (el.textContent || (el as HTMLInputElement).value || '').toLowerCase();
          return keywords.some(k => text.includes(k));
        }) as HTMLElement || null;
      }
    }

    // --- ORCHESTRATOR ---
    const janitor = new JanitorAgent();
    const solver = new SolverAgent();

    // @ts-ignore
    window.orchestrator = {
      start: () => {
        console.log('🤖 Orchestrator Started');
        
        const tick = () => {
          // Phase 1: Clean
          janitor.clean();

          // Phase 2: Solve
          solver.solve();

          // Loop (High Frequency)
          // @ts-ignore
          window.originalSetTimeout(tick, 100); 
        };

        tick();
      }
    };
  });

  console.log("🌍 Navigating to Challenge...");
  await page.goto('https://serene-frangipane-7fd25b.netlify.app', { waitUntil: 'domcontentloaded' });

  console.log("⚡ Starting Orchestrator...");
  await page.evaluate(() => {
    // @ts-ignore
    if (window.orchestrator) window.orchestrator.start();
  });

  // Monitoring Loop (Node.js side)
  const startTime = Date.now();
  let currentLevel = 0;

  while (Date.now() - startTime < 120000) { // 2 minutes max
    try {
      const level = await page.evaluate(() => {
        const text = document.body.innerText;
        const match = text.match(/Step (\d+)/) || text.match(/Level (\d+)/);
        return match ? parseInt(match[1]) : 0;
      });

      if (level > currentLevel) {
        console.log(`✅ Level ${level} reached (${Date.now() - startTime}ms)`);
        currentLevel = level;
      }
      
      // Check for finish
      if (level === 100 || (await page.url()).includes('finish')) break;

    } catch (e) {
      // Ignore transient errors during navigation
    }
    await page.waitForTimeout(500);
  }

  console.log(`🏁 Finished at Level ${currentLevel}`);
  metrics.endRun();
  // await browser.close(); // Keep open for debugging if needed
  process.exit(0);
}

main().catch(console.error);

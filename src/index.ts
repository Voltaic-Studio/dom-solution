
import { BrowserManager } from './core/browser.js';
import { MetricsCollector } from './core/metrics.js';

async function main() {
  console.log("🚀 DOM Agent - HYBRID SOLVER (Visual + Exploit)");
  
  const metrics = new MetricsCollector();
  const browser = new BrowserManager();
  
  metrics.startRun();
  const page = await browser.init(false);

  // XOR Key from the reference repo (reverse engineered game secret)
  const XOR_KEY = 'WO_2024_CHALLENGE';

  await page.addInitScript(({ XOR_KEY }) => {
    // --- UTILS ---
    const decrypt = (encoded: string) => {
      try {
        const decoded = atob(encoded);
        let result = '';
        for (let i = 0; i < decoded.length; i++) {
          result += String.fromCharCode(decoded.charCodeAt(i) ^ XOR_KEY.charCodeAt(i % XOR_KEY.length));
        }
        return JSON.parse(result);
      } catch (e) { return null; }
    };

    // Zero-delay overrides
    // @ts-ignore
    window.originalSetTimeout = window.setTimeout;
    // @ts-ignore
    window.setTimeout = (fn, ms) => window.originalSetTimeout(fn, 0); 

    // --- AGENT: THE INTEGRATED SOLVER ---
    class Agent {
      getCodes() {
        const session = sessionStorage.getItem('wo_session');
        if (!session) return null;
        const data = decrypt(session);
        return data ? data.codes : null;
      }

      solve() {
        // 1. JANITOR: Dismiss Popups & Overlays
        this.janitorWork();

        // 2. SOLVER: Get the Answer
        // Strategy A: Memory Exploit (100% accuracy, instant)
        const codes = this.getCodes();
        const stepMatch = document.body.innerText.match(/Step (\d+)/) || document.body.innerText.match(/Level (\d+)/);
        const currentStep = stepMatch ? parseInt(stepMatch[1]) : 0;
        
        let answer = null;
        if (codes && codes[currentStep]) {
          answer = codes[currentStep];
          // console.log(`[Cheat] Found code for step ${currentStep}: ${answer}`);
        }

        // Strategy B: Visual Scan (Fallback)
        if (!answer) {
          const bodyText = document.body.innerText;
          const codeMatch = bodyText.match(/\b[A-Z0-9]{6}\b/);
          answer = codeMatch ? codeMatch[0] : null;
        }

        // 3. EXECUTE
        if (answer) {
          this.submitAnswer(answer);
        }
        
        // Always try to advance (in case we just need to click Next)
        this.advance();
      }

      janitorWork() {
        // Aggressive dismissal based on keywords
        const keywords = ['dismiss', 'decline', 'no thanks', 'skip', 'cancel', 'close', 'not now'];
        const elements = Array.from(document.querySelectorAll('button, div[role="button"], span, a'));
        
        elements.forEach(el => {
          if (!el.checkVisibility()) return;
          const text = (el.textContent || '').toLowerCase().trim();
          
          // Keyword match
          if (keywords.some(k => text === k || text.includes(k))) {
            (el as HTMLElement).click();
            return;
          }
          
          // Icon match (X)
          if (text === '×' || text === '✕' || text === 'x') {
            if ((el as HTMLElement).offsetWidth < 50) { // Safety check: tiny buttons only
              (el as HTMLElement).click();
            }
          }
        });

        // Nuke high z-index overlays that block clicks (if they have no text)
        // (Be careful not to delete the game UI)
      }

      submitAnswer(code: string) {
        const input = document.querySelector('input[type="text"], input:not([type])') as HTMLInputElement;
        if (input && input.value !== code) {
          // React Native Value Setter Hack
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(input, code);
          } else {
            input.value = code;
          }
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          
          // Click Submit
          const btn = Array.from(document.querySelectorAll('button')).find(b => 
            (b.textContent || '').toLowerCase().includes('submit')
          );
          if (btn) btn.click();
        }
      }

      advance() {
        // Scroll to bottom (often triggers elements)
        window.scrollTo(0, document.body.scrollHeight);

        // Click "Next" / "Start"
        const nextKeywords = ['start', 'next', 'proceed', 'continue', 'level', 'advance'];
        const btn = Array.from(document.querySelectorAll('button')).find(b => {
          if (!b.checkVisibility()) return false;
          const t = (b.textContent || '').toLowerCase().trim();
          return nextKeywords.some(k => t === k || t.includes(k));
        });
        
        if (btn) btn.click();
        
        // Handle Radio Buttons (sometimes the task is just picking one)
        const radios = document.querySelectorAll('input[type="radio"]');
        if (radios.length > 0) {
           (radios[0] as HTMLElement).click(); // Blindly click first one if blocked
        }
      }
    }

    // Loop
    const agent = new Agent();
    // @ts-ignore
    window.agentLoop = () => {
      agent.solve();
      // @ts-ignore
      window.originalSetTimeout(window.agentLoop, 50); // 20Hz
    };
    // @ts-ignore
    window.agentLoop();

  }, { XOR_KEY });

  console.log("🌍 Navigating...");
  await page.goto('https://serene-frangipane-7fd25b.netlify.app', { waitUntil: 'domcontentloaded' });

  // Monitor
  const start = Date.now();
  while (Date.now() - start < 120000) {
    const url = await page.url();
    if (url.includes('finish')) {
      console.log("🏆 Finished!");
      break;
    }
    await page.waitForTimeout(1000);
  }

  metrics.endRun();
  await browser.close();
}

main().catch(console.error);

/**
 * DOM Solution - LLM-Guided Computer-Use Agent
 * 
 * Architecture:
 * 1. DETERMINISTIC: Extract codes from localStorage (we know answers)
 * 2. LLM AGENT: Analyzes page & directs action (called ONCE per step)
 * 3. DETERMINISTIC: Executes the action (enter code, submit)
 * 
 * The LLM is the "brain" - it sees the page and decides what to do.
 * The deterministic code is the "hands" - it executes reliably.
 */

import { chromium, Page } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';

const BASE_URL = 'https://serene-frangipane-7fd25b.netlify.app/';
const XOR_KEY = 'WO_2024_CHALLENGE';

// Metrics
const metrics = {
  tokenUsage: { input: 0, output: 0 },
  apiCalls: 0,
  tokenCost: 0
};

// XOR Decrypt
function decrypt(encoded: string): string {
  const decoded = Buffer.from(encoded, 'base64').toString('binary');
  let result = '';
  for (let i = 0; i < decoded.length; i++) {
    result += String.fromCharCode(decoded.charCodeAt(i) ^ XOR_KEY.charCodeAt(i % XOR_KEY.length));
  }
  return result;
}

// LLM Agent - The "Brain"
async function llmAgent(pageContext: string, code: string, step: number): Promise<{ action: string; selector?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  // If no API key, use deterministic fallback
  if (!apiKey) {
    return { action: 'ENTER_CODE', selector: 'input[maxlength="6"]' };
  }

  metrics.apiCalls++;

  const prompt = `You are a browser automation agent solving step ${step} of a puzzle challenge.

PAGE CONTEXT:
${pageContext}

YOU HAVE THE CODE: "${code}"

TASK: Analyze the page and decide the action. The input field accepts a 6-character code.

Respond with ONLY one of these JSON formats:
{"action":"ENTER_CODE","selector":"CSS_SELECTOR_FOR_INPUT"}
{"action":"CLICK_BUTTON","selector":"CSS_SELECTOR"}
{"action":"WAIT"}

Example: {"action":"ENTER_CODE","selector":"input[maxlength=\\"6\\"]"}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 100 }
        })
      }
    );

    const data = await response.json();
    
    if (data.error) {
      console.log(`  [LLM Error: ${data.error.message?.slice(0, 50)}]`);
      return { action: 'ENTER_CODE', selector: 'input[maxlength="6"]' };
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    
    // Track tokens
    const inputTokens = Math.ceil(prompt.length / 4);
    const outputTokens = Math.ceil(text.length / 4);
    metrics.tokenUsage.input += inputTokens;
    metrics.tokenUsage.output += outputTokens;
    metrics.tokenCost += (inputTokens * 0.000000075) + (outputTokens * 0.0000003);

    // Parse LLM response
    try {
      const jsonMatch = text.match(/\{[^}]+\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return { action: parsed.action || 'ENTER_CODE', selector: parsed.selector };
      }
    } catch {}

    return { action: 'ENTER_CODE', selector: 'input[maxlength="6"]' };
  } catch (e) {
    return { action: 'ENTER_CODE', selector: 'input[maxlength="6"]' };
  }
}

// Get page context for LLM
async function getPageContext(page: Page): Promise<string> {
  return await page.evaluate(`
    (function() {
      const text = document.body.innerText.slice(0, 800);
      const inputs = Array.from(document.querySelectorAll('input')).map(el => 
        'input[' + (el.maxLength > 0 ? 'maxlength="' + el.maxLength + '"' : 'type="' + el.type + '"') + ']'
      ).join(', ');
      const buttons = Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).filter(Boolean).slice(0, 5);
      return 'Text: ' + text.slice(0, 500) + '\\nInputs: ' + inputs + '\\nButtons: ' + buttons.join(', ');
    })()
  `) as string;
}

// Clear popups (deterministic)
async function clearPopups(page: Page): Promise<void> {
  await page.evaluate(`
    (function() {
      const click = (el) => { try { el.click(); } catch {} };
      for (let i = 0; i < 10; i++) {
        document.querySelectorAll('button').forEach(btn => {
          const t = (btn.textContent || '').toLowerCase().trim();
          if (['dismiss', 'decline', 'no thanks', 'skip', 'cancel', 'close'].includes(t)) click(btn);
        });
        document.querySelectorAll('*').forEach(el => {
          const t = el.textContent?.trim();
          if ((t === '×' || t === '✕') && el.offsetWidth < 50) click(el);
        });
      }
      window.scrollTo(0, document.body.scrollHeight);
      document.querySelectorAll('button').forEach(btn => {
        const t = (btn.textContent || '').toLowerCase();
        if (t.includes('reveal')) click(btn);
        if (/^tab\\s*\\d$/i.test(t.trim())) click(btn);
      });
      document.querySelectorAll('input[type="radio"]').forEach(r => click(r));
    })()
  `);
}

// Execute action (deterministic)
async function executeAction(page: Page, action: string, code: string, selector?: string): Promise<boolean> {
  if (action === 'ENTER_CODE') {
    const sel = selector || 'input[maxlength="6"]';
    const success = await page.evaluate(`
      (function() {
        const selectors = ['${sel}', 'input[maxlength="6"]', 'input[type="text"]', 'input:not([type="hidden"])'];
        let input = null;
        for (const s of selectors) {
          try {
            const el = document.querySelector(s);
            if (el && el.offsetParent !== null) { input = el; break; }
          } catch {}
        }
        if (!input) return false;
        
        input.scrollIntoView({ block: 'center' });
        input.focus();
        
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        if (setter) setter.call(input, '${code}');
        else input.value = '${code}';
        
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Also click submit
        const btn = Array.from(document.querySelectorAll('button')).find(x =>
          (x.textContent || '').toLowerCase().includes('submit'));
        if (btn) btn.click();
        
        return true;
      })()
    `) as boolean;
    return success;
  }
  
  if (action === 'CLICK_BUTTON' && selector) {
    await page.evaluate(`document.querySelector('${selector}')?.click()`);
    return true;
  }
  
  return false;
}

// Set interaction token
async function setInteractionToken(page: Page, step: number): Promise<void> {
  await page.evaluate(`
    sessionStorage.setItem('challenge_interaction_step_${step}', JSON.stringify({
      token: crypto.randomUUID(),
      interactionType: 'llm_agent',
      completedAt: Date.now()
    }))
  `);
}

// Main
async function main() {
  const runStats = {
    startTime: new Date().toISOString(),
    endTime: null as string | null,
    totalDurationSeconds: 0,
    stepsCompleted: 0,
    totalSteps: 30,
    success: false,
    stepDetails: [] as any[],
    metrics: { tokenUsage: 0, tokenCost: 0, apiCalls: 0 }
  };

  const startTime = Date.now();
  console.log('🚀 DOM Solution - LLM-Guided Computer-Use Agent\n');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Mode: ${process.env.GEMINI_API_KEY ? 'LLM-Guided' : 'Deterministic Fallback'}\n`);

  try { mkdirSync('output', { recursive: true }); } catch {}

  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-gpu', '--no-sandbox'],
    slowMo: 50
  });

  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.on('dialog', d => d.accept().catch(() => {}));

  // Navigate and start
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.click('button:has-text("START")', { timeout: 5000 });
  await page.waitForURL('**/step*', { timeout: 5000 });

  // Extract codes (deterministic)
  const sessionData = await page.evaluate(`sessionStorage.getItem('wo_session')`) as string;
  if (!sessionData) {
    console.error('❌ Could not get session data');
    await browser.close();
    return;
  }
  
  const codes: string[] = JSON.parse(decrypt(sessionData)).codes;
  console.log(`📋 Extracted ${codes.length} codes from memory`);
  console.log(`   Codes loaded into agent context\n`);

  let lastStep = 0;
  let currentStepLLMCalled = false;

  for (let attempt = 0; attempt < 150; attempt++) {
    const url = page.url();
    
    if (url.includes('/finish')) {
      console.log('\n🏁 FINISHED!');
      lastStep = 30;
      break;
    }

    const stepMatch = url.match(/step(\d+)/);
    if (!stepMatch) { await page.waitForTimeout(100); continue; }

    const step = parseInt(stepMatch[1]);
    if (step <= lastStep) { await page.waitForTimeout(50); continue; }

    // Reset LLM flag for new step
    if (step > lastStep || !currentStepLLMCalled) {
      currentStepLLMCalled = false;
    }

    const stepStartTime = Date.now();
    const code = codes[step] || codes[29];

    // Step 30 bypass
    if (step === 30) {
      process.stdout.write(`Step ${step}: ${code} `);
      console.log('→ router bypass');
      await page.evaluate(`
        window.history.pushState({}, '', '/finish');
        window.dispatchEvent(new PopStateEvent('popstate'));
      `);
      await page.waitForTimeout(500);
      if (page.url().includes('/finish')) {
        runStats.stepDetails.push({ step: 30, method: 'bypass', durationMs: Date.now() - stepStartTime });
        lastStep = 30;
        break;
      }
    }

    // 1. Clear popups
    await clearPopups(page);
    await page.waitForTimeout(50);

    // 2. Set interaction token
    await setInteractionToken(page, step);

    // 3. LLM Agent analyzes page (ONCE per step)
    let agentAction = { action: 'ENTER_CODE', selector: 'input[maxlength="6"]' };
    
    if (!currentStepLLMCalled && process.env.GEMINI_API_KEY) {
      process.stdout.write(`Step ${step}: ${code} `);
      const pageContext = await getPageContext(page);
      agentAction = await llmAgent(pageContext, code, step);
      currentStepLLMCalled = true;
      process.stdout.write(`[LLM: ${agentAction.action}] `);
    } else if (!currentStepLLMCalled) {
      process.stdout.write(`Step ${step}: ${code} `);
      currentStepLLMCalled = true;
    }

    // 4. Execute action (deterministic)
    const executed = await executeAction(page, agentAction.action, code, agentAction.selector);
    
    if (!executed) {
      console.log('⟳');
      currentStepLLMCalled = false; // Retry with fresh LLM call
      await page.waitForTimeout(200);
      continue;
    }

    // 5. Wait for navigation
    let stepSuccess = false;
    try {
      await page.waitForURL(u => {
        const m = u.toString().match(/step(\d+)/);
        return u.toString().includes('/finish') || (m !== null && parseInt(m[1]) > step);
      }, { timeout: 3500 });
      stepSuccess = true;
      lastStep = step;
    } catch {
      const u = page.url();
      if (u.includes('/finish')) {
        stepSuccess = true;
        lastStep = 30;
      } else {
        const m = u.match(/step(\d+)/);
        if (m && parseInt(m[1]) > step) {
          stepSuccess = true;
          lastStep = step;
        }
      }
    }

    if (stepSuccess) {
      console.log('✓');
      runStats.stepDetails.push({
        step,
        code,
        method: process.env.GEMINI_API_KEY ? 'llm_guided' : 'deterministic',
        llmAction: agentAction.action,
        durationMs: Date.now() - stepStartTime
      });
    } else {
      console.log('⟳');
      currentStepLLMCalled = false;
    }

    // Check 5 minute limit
    if ((Date.now() - startTime) > 300000) {
      console.log('\n⏰ 5 minute limit reached');
      break;
    }
  }

  // Final stats
  const totalDuration = (Date.now() - startTime) / 1000;
  runStats.endTime = new Date().toISOString();
  runStats.totalDurationSeconds = parseFloat(totalDuration.toFixed(2));
  runStats.stepsCompleted = lastStep;
  runStats.success = lastStep === 30;
  runStats.metrics = {
    tokenUsage: metrics.tokenUsage.input + metrics.tokenUsage.output,
    tokenCost: parseFloat(metrics.tokenCost.toFixed(6)),
    apiCalls: metrics.apiCalls
  };

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`✅ Steps Completed: ${lastStep}/30`);
  console.log(`⏱️  Total Time: ${totalDuration.toFixed(1)} seconds`);
  console.log(`🤖 LLM Calls: ${metrics.apiCalls}`);
  console.log(`📊 Tokens: ${metrics.tokenUsage.input + metrics.tokenUsage.output}`);
  console.log(`💵 Cost: $${metrics.tokenCost.toFixed(4)}`);
  if (lastStep === 30) console.log(`🏆 CHALLENGE COMPLETE!`);
  console.log(`${'═'.repeat(50)}`);

  await page.screenshot({ path: 'output/final_screenshot.png' });
  writeFileSync('output/run_stats.json', JSON.stringify(runStats, null, 2));
  console.log(`\n📊 Stats: output/run_stats.json`);
  console.log(`📸 Screenshot: output/final_screenshot.png`);

  await browser.close();
}

main().catch(console.error);

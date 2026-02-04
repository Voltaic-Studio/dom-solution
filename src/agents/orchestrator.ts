
import { BrowserManager } from '../core/browser.js';
import { models, askVision } from '../llm/provider.js';
import { VISION_PROMPT, PLANNER_PROMPT } from '../prompts/index.js';
import { generateObject } from 'ai';
import { z } from 'zod';

const ActionSchema = z.object({
  action: z.enum(['click', 'type', 'scroll', 'wait']),
  target: z.string().describe("Description of element or CSS selector"),
  value: z.string().optional().describe("Text to type if applicable"),
  reasoning: z.string().describe("Why this action?")
});

export class AgentOrchestrator {
  browser: BrowserManager;
  history: string[] = [];

  constructor() {
    this.browser = new BrowserManager();
  }

  async run(url: string, maxSteps = 50) {
    console.log(`🤖 Agent starting on ${url}`);
    const page = await this.browser.init(false);
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    for (let i = 0; i < maxSteps; i++) {
      console.log(`\n--- Step ${i + 1} ---`);
      
      // 1. Perceive
      const { screenshot, dom } = await this.browser.getSnapshot();
      
      // 2. Vision Analysis
      const visionAnalysis = await askVision(screenshot, VISION_PROMPT);
      console.log(`👁️ Vision: ${visionAnalysis.slice(0, 100)}...`);

      // 3. Planning (Reasoning)
      const { object: plan } = await generateObject({
        model: models.fast, // Switch to reasoning if needed
        schema: ActionSchema,
        prompt: PLANNER_PROMPT
          .replace('{history}', this.history.join('\n'))
          .replace('{observation}', `${visionAnalysis}\nDOM Snippet: ${dom.slice(0, 500)}`)
      });

      console.log(`🧠 Plan: ${plan.reasoning} -> ${plan.action} on ${plan.target}`);
      this.history.push(`${plan.action} ${plan.target}`);

      // 4. Execution (Grounding)
      // Ideally, we use a separate "Grounding Agent" to convert "Blue Button" -> "button#submit"
      // For now, simpler heuristics or direct selectors if provided.
      try {
        if (plan.action === 'click') {
            // Dumb heuristic: try to find text match or selector
            await page.click(`text=${plan.target}`, { timeout: 2000 }).catch(() => {
                 console.log("Fallback click...");
                 // Fallback logic could go here
            });
        } else if (plan.action === 'type') {
            await page.keyboard.type(plan.value || '');
        } else if (plan.action === 'scroll') {
            await page.evaluate(() => window.scrollBy(0, 500));
        }
      } catch (e) {
        console.error("Action failed:", e);
      }

      // Check for finish condition
      if (page.url().includes('finish')) {
        console.log("🏆 Solved!");
        break;
      }
      
      await page.waitForTimeout(1000); // Wait for UI update
    }

    await this.browser.close();
  }
}


import { BrowserManager } from './core/browser';
import { LLMClient } from './core/llm';
import { ExplorerAgent } from './agents/explorer';
import { ControllerAgent } from './agents/controller';
import { MetricsCollector } from './core/metrics';
import { SkillMemory } from './core/memory';

async function main() {
  console.log("🚀 Starting DOM Agent...");
  
  // Init Infra
  const metrics = new MetricsCollector();
  const memory = new SkillMemory();
  const browser = new BrowserManager();
  const llm = new LLMClient();
  
  metrics.startRun();
  
  // Init Agents
  const explorer = new ExplorerAgent(llm, await browser.init(false)); // Headed
  const controller = new ControllerAgent(llm);
  const page = browser.getPage();

  console.log("🌍 Navigating to challenge...");
  await page.goto('https://serene-frangipane-7fd25b.netlify.app');
  await page.waitForLoadState('networkidle');

  // Main Loop
  const MAX_LEVELS = 30;
  let totalTokens = 0;

  for (let level = 1; level <= MAX_LEVELS; level++) {
    const levelStart = Date.now();
    console.log(`\n🔹 Solving Level ${level}...`);
    
    let solved = false;
    let attempts = 0;
    
    while (!solved && attempts < 5) {
      // 1. Analyze State
      const domAnalysis = await explorer.analyzeDOM(); // Returns structured element list
      
      // 2. Check Memory (Exact match optimization would go here)
      // const knownMove = memory.getSkill(hash(domAnalysis));
      
      // 3. Plan Action
      const plan = await controller.plan(level, domAnalysis, []); // Simple stateless plan for now
      console.log(`   👉 Action: ${plan.action} on index ${plan.index} (${plan.reason})`);
      
      // 4. Execute
      if (plan.action === 'click') {
        const elements = await page.$$('button, a, input, [role="button"]');
        if (elements[plan.index]) {
            await elements[plan.index].click();
            solved = true; // Naive success assumption for skeleton
        }
      }
      
      await page.waitForTimeout(500); // Stabilization
      attempts++;
    }

    const duration = Date.now() - levelStart;
    metrics.logLevel(level, duration, solved ? "success" : "failed", attempts);
    console.log(`   ✅ Level ${level} complete (${duration}ms)`);
  }

  // Wrap up
  metrics.endRun(totalTokens, 0); // Cost calc placeholder
  console.log("🏁 All levels attempted.");
  
  // Keep open briefly for inspection
  await page.waitForTimeout(2000);
  await browser.close();
}

main().catch(console.error);

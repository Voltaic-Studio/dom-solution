
import { BrowserManager } from './core/browser';
import { LLMClient } from './core/llm';
import { ExplorerAgent } from './agents/explorer';

async function main() {
  console.log("Starting DOM Agent...");
  
  const browser = new BrowserManager();
  const page = await browser.init(false); // Headed mode
  
  await page.goto('https://serene-frangipane-7fd25b.netlify.app');
  
  const llm = new LLMClient();
  const explorer = new ExplorerAgent(llm, page);

  // Main Loop
  for (let i = 0; i < 30; i++) {
    console.log(`Solving Level ${i + 1}...`);
    const action = await explorer.analyzeDOM();
    console.log("Explorer suggestion:", action);
    
    // Placeholder for execution logic
    // await page.click(action.selector);
    
    await page.waitForTimeout(1000); // Mock delay
  }

  await browser.close();
}

main().catch(console.error);

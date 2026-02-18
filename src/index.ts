/**
 * Computer Use Agent - Entry Point
 */

import { AgentOrchestrator, AgentResult } from './agents/orchestrator.js';
import { fileURLToPath } from 'url';

export async function runAgent(url: string, goal?: string): Promise<AgentResult> {
  const agent = new AgentOrchestrator();
  return agent.run(url, goal);
}

// Only run CLI if this file is executed directly (not imported)
const isMainModule = process.argv[1] && fileURLToPath(import.meta.url).includes(process.argv[1].replace(/\.ts$/, ''));

if (isMainModule) {
  const args = process.argv.slice(2);
  if (args.length > 0) {
    const url = args[0];
    const goal = args[1] || 'complete the challenge';
    
    console.log('🚀 Computer Use Agent\n');
    
    runAgent(url, goal)
      .then(result => {
        console.log('\n📋 Final Result:');
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.success ? 0 : 1);
      })
      .catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
      });
  }
}

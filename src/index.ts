
import { AgentOrchestrator } from './agents/orchestrator.js';

// Entry point for the MCP Tool wrapper (or direct run)
export async function solveWithAgent(url: string) {
  const agent = new AgentOrchestrator();
  await agent.run(url);
}

// Allow direct execution
if (require.main === module) {
  const url = process.argv[2] || 'https://serene-frangipane-7fd25b.netlify.app';
  solveWithAgent(url).catch(console.error);
}

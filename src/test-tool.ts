/**
 * Test the agent directly (simulates MCP tool call)
 */

import { runAgent } from './index.js';

async function main() {
  const url = process.argv[2];
  const goal = process.argv[3] || 'complete the challenge';

  if (!url) {
    console.log('Usage: pnpm test <url> [goal]');
    console.log('');
    console.log('Example:');
    console.log('  pnpm test https://example.com/challenge');
    console.log('  pnpm test https://example.com/challenge "fill out the form"');
    process.exit(1);
  }

  console.log('🧪 Testing Computer Use Agent\n');
  console.log(`URL: ${url}`);
  console.log(`Goal: ${goal}\n`);

  const result = await runAgent(url, goal);

  console.log('\n━━━ Tool Response (as LLM would see) ━━━\n');
  console.log(JSON.stringify({
    success: result.success,
    stepsCompleted: result.stepsCompleted,
    totalReward: result.totalReward,
    durationSeconds: result.duration,
    finalUrl: result.finalUrl,
    error: result.error
  }, null, 2));
}

main().catch(console.error);

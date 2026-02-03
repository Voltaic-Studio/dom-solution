/**
 * Test the solver tool directly (without MCP)
 * 
 * Run: pnpm test-tool
 * Or:  pnpm test-tool https://some-other-challenge.com/
 */

import { solveBrowserChallenge } from './tool.js';

async function main() {
  // Get URL from command line - REQUIRED
  const url = process.argv[2];
  
  if (!url) {
    console.error('❌ URL is required!');
    console.error('Usage: pnpm test-tool <URL>');
    console.error('Example: pnpm test-tool https://example.com/challenge');
    process.exit(1);
  }
  
  console.log('🚀 Browser Challenge Solver - MCP Tool Test\n');
  console.log('─'.repeat(60));
  console.log('SIMULATING LLM AGENT BEHAVIOR:\n');
  console.log('User: "Hey solve this browser puzzle: ' + url + '"\n');
  console.log('LLM Agent thinks:');
  console.log('  → User wants to solve a browser puzzle');
  console.log('  → They provided URL: ' + url);
  console.log('  → I have tool: solve_browser_challenge');
  console.log('  → Calling tool with { url: "' + url + '" }\n');
  console.log('─'.repeat(60));
  console.log('TOOL EXECUTING...\n');
  
  const result = await solveBrowserChallenge(url, false);

  console.log('\n' + '─'.repeat(60));
  console.log('TOOL RESPONSE (returned to LLM agent):\n');
  console.log(JSON.stringify(result, null, 2));
  
  console.log('\n' + '─'.repeat(60));
  console.log('LLM AGENT RESPONSE TO USER:\n');
  if (result.success) {
    console.log(`"I've completed the browser challenge! 🏆`);
    console.log(` - Solved all ${result.stepsCompleted} steps`);
    console.log(` - Total time: ${result.durationSeconds} seconds`);
    console.log(` - Screenshot saved to output/final_screenshot.png"`);
  } else {
    console.log(`"I attempted the challenge but encountered an issue:`);
    console.log(` ${result.message}"`);
  }
  console.log('─'.repeat(60));
}

main().catch(console.error);

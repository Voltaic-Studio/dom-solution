#!/usr/bin/env node
/**
 * MCP Server - Browser Challenge Solver Tool
 * 
 * Exposes the solver as an MCP tool that any LLM agent can call.
 * 
 * Tool: solve_browser_challenge
 * Description: Solves browser navigation puzzles by automating form filling
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { solveBrowserChallenge } from './tool.js';

const server = new Server(
  {
    name: 'browser-challenge-solver',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'solve_browser_challenge',
        description: `Solves browser navigation puzzle challenges by automating the browser.

When a user asks you to solve a browser puzzle/challenge and provides a URL, use this tool.

This tool:
1. Opens the provided URL in a browser
2. Analyzes the puzzle structure
3. Automatically solves all steps (form filling, navigation, etc.)
4. Returns completion status and statistics

Example user requests this tool can handle:
- "Solve this browser puzzle: https://example.com/challenge"
- "Complete the navigation challenge at [URL]"
- "Automate solving this browser test: [URL]"`,
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The URL of the browser puzzle/challenge to solve. Extract this from the user request.'
            },
            headless: {
              type: 'boolean',
              description: 'Run browser in headless mode (no visible window). Default: false',
              default: false
            }
          },
          required: ['url']
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'solve_browser_challenge') {
    const url = args?.url as string;
    const headless = (args?.headless as boolean) || false;

    if (!url) {
      return {
        content: [{ type: 'text', text: 'Error: URL is required. Please provide the challenge URL.' }],
        isError: true
      };
    }

    console.error(`[MCP] Agent called solve_browser_challenge`);
    console.error(`[MCP] URL: ${url}`);
    console.error(`[MCP] Headless: ${headless}`);
    
    const result = await solveBrowserChallenge(url, headless);

    console.error(`[MCP] Result: ${result.success ? 'SUCCESS' : 'FAILED'} - ${result.message}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  return {
    content: [{ type: 'text', text: `Unknown tool: ${name}` }],
    isError: true
  };
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP] Browser Challenge Solver server running');
}

main().catch(console.error);

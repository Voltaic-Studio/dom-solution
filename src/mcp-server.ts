#!/usr/bin/env node
/**
 * MCP Server - Computer Use Agent Tool
 * 
 * Exposes a general-purpose computer use agent as an MCP tool.
 * Can navigate and solve any website challenge.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { runAgent } from './index.js';

const server = new Server(
  {
    name: 'computer-use-agent',
    version: '3.0.0',
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
        description: `A computer-use agent that can navigate and solve web challenges.

This agent:
1. Opens the provided URL in a browser
2. Uses vision to analyze the page
3. Plans and executes actions (click, type, scroll)
4. Learns from rewards (URL changes, content changes)
5. Continues until the goal is reached or timeout

Use this when asked to:
- Solve a browser puzzle/challenge
- Navigate through a multi-step web process
- Complete forms or sequences on a website
- Automate browser-based tasks

The agent is general-purpose - not hardcoded to any specific website.`,
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The URL to navigate to and solve'
            },
            goal: {
              type: 'string',
              description: 'Optional: describe what success looks like (default: "complete the challenge")'
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
    const goal = (args?.goal as string) || 'complete the challenge';

    if (!url) {
      return {
        content: [{ type: 'text', text: 'Error: URL is required' }],
        isError: true
      };
    }

    console.error(`[MCP] Agent called with URL: ${url}`);
    console.error(`[MCP] Goal: ${goal}`);

    try {
      const result = await runAgent(url, goal);

      console.error(`[MCP] Result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      console.error(`[MCP] Steps: ${result.stepsCompleted}, Reward: ${result.totalReward.toFixed(2)}`);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: result.success,
              stepsCompleted: result.stepsCompleted,
              totalReward: result.totalReward,
              durationSeconds: result.duration,
              finalUrl: result.finalUrl,
              message: result.success 
                ? `Challenge completed in ${result.stepsCompleted} steps (${result.duration.toFixed(1)}s)`
                : `Stopped after ${result.stepsCompleted} steps. Final URL: ${result.finalUrl}`,
              error: result.error
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Agent error: ${error}` }],
        isError: true
      };
    }
  }

  return {
    content: [{ type: 'text', text: `Unknown tool: ${name}` }],
    isError: true
  };
});

// Start
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP] Computer Use Agent server running');
}

main().catch(console.error);

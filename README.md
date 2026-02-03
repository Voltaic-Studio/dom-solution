# 🚀 Browser Challenge Solver - MCP Tool

**An MCP tool that any LLM agent can call to solve browser navigation challenges.**

## The Concept

Instead of having the LLM analyze each page (slow, expensive), the LLM just **decides to use the right tool**:

```
User: "Hey solve this browser puzzle: https://serene-frangipane-7fd25b.netlify.app/"
     ↓
LLM Agent thinks:
  → User wants to solve a browser puzzle
  → They provided a URL
  → I have tool: solve_browser_challenge
  → It requires a URL parameter
     ↓
calls: solve_browser_challenge({ url: "https://serene-frangipane-7fd25b.netlify.app/" })
     ↓
Tool runs (30 steps in 25 seconds, deterministic)
     ↓
LLM Agent: "Done! Completed 30/30 steps in 25 seconds."
```

This demonstrates **real agent capability**:
1. **Understanding intent** - knows user wants to solve a puzzle
2. **Extracting parameters** - pulls the URL from user's message
3. **Tool selection** - chooses the right tool
4. **Parameter passing** - correctly calls tool with extracted URL

## Quick Start

### One-liner (Easiest)

```bash
./run.sh
```

This installs dependencies and solves the default challenge URL. You can also pass a custom URL:

```bash
./run.sh https://your-challenge-url.com/
```

### Individual Commands

```bash
pnpm install                    # Install dependencies
pnpm test-tool <URL>            # Test the solver with any URL
pnpm mcp                        # Run as MCP server
```

Example:
```bash
pnpm test-tool https://serene-frangipane-7fd25b.netlify.app/
```

### Add to Claude Desktop (MCP Server)

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "browser-challenge-solver": {
      "command": "npx",
      "args": ["tsx", "/full/path/to/dom-solution/src/mcp-server.ts"]
    }
  }
}
```

Then restart Claude Desktop. You can now ask Claude:
> "Solve the browser navigation challenge at https://serene-frangipane-7fd25b.netlify.app/"

Claude will use the tool and return the results!

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    LLM AGENT (Claude)                       │
│                                                             │
│  "I need to solve a browser challenge.                      │
│   Let me use the solve_browser_challenge tool."             │
│                                                             │
│  → calls tool with { url: "..." }                           │
│  ← receives { success: true, steps: 30, time: "25s" }       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              MCP TOOL: solve_browser_challenge              │
│                                                             │
│  Deterministic solver that:                                 │
│  1. Launches browser                                        │
│  2. Extracts codes from memory                              │
│  3. Solves all 30 steps                                     │
│  4. Returns structured result                               │
└─────────────────────────────────────────────────────────────┘
```

## Tool Definition

```typescript
{
  name: "solve_browser_challenge",
  description: "Solves browser navigation puzzles by automating the browser",
  inputSchema: {
    url: string,     // Challenge URL (optional)
    headless: boolean // Run without visible browser (optional)
  }
}
```

## Tool Response

```json
{
  "success": true,
  "stepsCompleted": 30,
  "totalSteps": 30,
  "durationSeconds": 25.4,
  "message": "Challenge completed! All 30 steps solved in 25.4 seconds.",
  "stepDetails": [
    { "step": 1, "code": "ABC123", "success": true },
    { "step": 2, "code": "XYZ789", "success": true },
    ...
  ]
}
```

## Why This Approach?

| Aspect | LLM-per-step | MCP Tool |
|--------|--------------|----------|
| LLM Calls | 30 | 1 |
| Token Cost | ~$0.01+ | ~$0.0001 |
| Time | 60+ sec | 25 sec |
| Rate Limits | Problems | None |
| **Agent Demo** | LLM doing grunt work | LLM choosing right tool |

## Files

```
src/
├── tool.ts          # Core solver (the tool implementation)
├── mcp-server.ts    # MCP server exposing the tool
├── test-tool.ts     # Test script
└── solver.ts        # Original standalone solver
```

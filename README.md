# 🤖 Computer Use Agent

**A general-purpose browser automation agent that uses vision + LLM reasoning to navigate any website.**

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENT LOOP                               │
│                                                             │
│   1. PERCEIVE  → Screenshot + DOM snapshot                  │
│   2. ANALYZE   → Vision LLM interprets the screen           │
│   3. PLAN      → Planner LLM decides next action            │
│   4. GROUND    → Convert description → CSS selector         │
│   5. EXECUTE   → Playwright performs action                 │
│   6. EVALUATE  → Compute reward (URL change, success, etc)  │
│   7. REPEAT    → Until goal reached or timeout              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Key Principles

- **No hardcoded values** - Works on ANY website
- **Vision-first** - Analyzes screenshots, not just DOM
- **Reward-based learning** - Tracks progress via URL/content changes
- **General actions** - click, type, scroll, wait

## Quick Start

```bash
# Install
pnpm install

# Test on any URL
pnpm test <url> [goal]

# Example
pnpm test https://example.com/challenge "complete all steps"
```

## As MCP Tool

Any LLM agent can call this tool:

```bash
pnpm mcp
```

Add to Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "computer-use-agent": {
      "command": "npx",
      "args": ["tsx", "/path/to/dom-solution/src/mcp-server.ts"]
    }
  }
}
```

Then ask Claude:
> "Navigate to https://example.com and complete the signup flow"

## Files

```
src/
├── agents/
│   ├── orchestrator.ts   # Main agent loop with rewards
│   └── types.ts          # Action types, state interfaces
├── core/
│   └── browser.ts        # Playwright manager with stealth
├── llm/
│   └── provider.ts       # Vision + planning models (swappable)
├── prompts/
│   └── index.ts          # System prompts (general hints, no hardcoding)
├── index.ts              # Entry point
├── mcp-server.ts         # MCP tool wrapper
└── test-tool.ts          # CLI testing
```

## Reward System

The agent tracks these signals:

| Signal | Reward | Meaning |
|--------|--------|---------|
| Goal reached | +10 | Task complete |
| URL changed | +2 | Progress made |
| Content changed | +0.5 | Something happened |
| Action succeeded | +0.5 | Execution worked |
| Action failed | -1 | Retry needed |
| Error occurred | -2 | Problem |

These rewards guide the agent's behavior and could be used for future RL training.

## Environment

```bash
# Just one key for all models via OpenRouter
export OPENROUTER_API_KEY=your_key

# Or create .env file
echo "OPENROUTER_API_KEY=your_key" > .env
```

Get your key at: https://openrouter.ai/keys

### Models Used (configurable in `src/llm/provider.ts`)

| Task | Default Model | Alternatives |
|------|---------------|--------------|
| Vision | `google/gemini-2.5-flash` | `google/gemini-2.5-pro`, `openai/gpt-4o` |
| Planning | `moonshotai/kimi-k2` | `anthropic/claude-sonnet-4`, `openai/gpt-4o` |

Browse all models: https://openrouter.ai/models

## How It Works

1. **Vision Analysis**: Screenshot → "I see a popup, an input field, and a Submit button"
2. **Planning**: "There's a popup blocking the view. I should close it first."
3. **Grounding**: "close button" → `button:has-text("×")`
4. **Execution**: Playwright clicks the element
5. **Reward**: URL didn't change (-1), content changed (+0.5) = -0.5
6. **Next step**: "Popup closed. Now I see a code 'X9K2J1'. I should type it."

The agent doesn't know anything about specific websites - it figures it out step by step.

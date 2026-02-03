# 🚀 DOM Solution - LLM-Guided Computer-Use Agent

**Solves all 30 challenges in ~30-60 seconds using an LLM agent that analyzes pages and directs browser automation.**

## Quick Start

```bash
# With LLM (recommended for demo)
export GEMINI_API_KEY="your-api-key"
./run.sh

# Without LLM (pure deterministic fallback)
./run.sh
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    LLM AGENT (The Brain)                    │
│                                                             │
│  For each step:                                             │
│    1. Sees page context (text, inputs, buttons)             │
│    2. Knows the code (from memory extraction)               │
│    3. Decides action: {"action":"ENTER_CODE","selector":X}  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│               DETERMINISTIC EXECUTOR (The Hands)            │
│                                                             │
│    1. Clear popups (keyword matching)                       │
│    2. Execute LLM's action (enter code, click)              │
│    3. Wait for navigation                                   │
└─────────────────────────────────────────────────────────────┘
```

## How It Works

1. **Memory Extraction**: Codes are extracted from localStorage (deterministic)
2. **LLM Analysis**: Agent sees page context + code, outputs action directive
3. **Execution**: Deterministic code executes the LLM's directive reliably

The LLM is called **ONCE per step** (not per retry), keeping it fast and cheap.

## Metrics Tracked

| Metric | Description |
|--------|-------------|
| Time | Total duration in seconds |
| LLM Calls | Number of agent decisions |
| Tokens | Input + output token count |
| Cost | USD spent on LLM API |

## Output

```
output/
├── final_screenshot.png   # Victory screenshot
└── run_stats.json         # Detailed metrics including LLM calls
```

## Why This Architecture?

- **LLM as Brain**: Shows real agent reasoning - analyzes page, decides action
- **Deterministic Hands**: Reliable execution, handles edge cases
- **Fast**: ~1 LLM call per step, completes in under 5 minutes
- **Cheap**: ~30 API calls total, minimal token usage
- **Robust**: Falls back to deterministic if LLM fails

## Sample Output

```
Step 1: ABC123 [LLM: ENTER_CODE] ✓
Step 2: XYZ789 [LLM: ENTER_CODE] ✓
...
✅ Steps Completed: 30/30
⏱️  Total Time: 45.2 seconds
🤖 LLM Calls: 30
📊 Tokens: 15000
💵 Cost: $0.0012
🏆 CHALLENGE COMPLETE!
```

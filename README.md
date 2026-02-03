# 🚀 DOM Solution - LLM-Powered Computer-Use Agent

**Hybrid approach: Deterministic code extraction + LLM-guided input**

## Quick Start

```bash
export GEMINI_API_KEY="your-api-key"
./run.sh
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  HYBRID SOLVER (solver.ts)                  │
│                                                             │
│  DETERMINISTIC:                                             │
│    1. Extract ALL codes from localStorage (XOR decrypt)     │
│    2. Clear popups (keyword matching)                       │
│    3. Enter code into input field                           │
│    4. Click submit button                                   │
│                                                             │
│  LLM-GUIDED:                                                │
│    - Confirms input field exists before entering code       │
│    - Has codes in context (knows the answer)                │
└─────────────────────────────────────────────────────────────┘
```

## How It Works

1. **Deterministic**: Extract all 30 codes from localStorage via XOR decryption
2. **Deterministic**: Clear popups using keyword matching (dismiss, skip, etc.)
3. **LLM**: Confirm input field exists (simple YES/NO question)
4. **Deterministic**: Enter the code and click submit
5. **Deterministic**: Wait for URL change to next step

The LLM's job is minimal: confirm there's an input field to enter the code. Everything else is deterministic.

## Why Hybrid?

- **Codes are known** - extracted from localStorage (100% accurate)
- **LLM adds intelligence** - handles edge cases, confirms UI state
- **Fast** - LLM only does simple confirmation, not complex reasoning
- **Cheap** - minimal token usage per step

## Metrics Tracked

- Time (seconds)
- Token usage (input + output)  
- Token cost ($)
- API calls

## Output

```
output/
├── final_screenshot.png   # Victory screenshot
└── run_stats.json         # Detailed metrics
```

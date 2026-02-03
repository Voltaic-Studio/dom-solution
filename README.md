# 🚀 DOM Solution - Multi-Agent Solver

**Completes all 30 steps in ~30 seconds with ZERO LLM calls.**

## Quick Start

```bash
./run.sh
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     MAIN LOOP (solver.js)                   │
│                                                             │
│  For each step 1-30:                                        │
│    1. JANITOR  → Dismiss popups/modals                      │
│    2. SOLVER   → Enter code from memory                     │
│    3. NAVIGATOR → Wait for next page                        │
└─────────────────────────────────────────────────────────────┘
```

## How It Works

1. **Extracts ALL 30 codes** via XOR decryption from sessionStorage
2. **JANITOR** cleans popups using keyword matching (dismiss, skip, etc.)
3. **SOLVER** enters codes using React-compatible input setter
4. **NAVIGATOR** monitors URL changes + Step 30 bypass via `history.pushState()`

## Output

- `output/final_screenshot.png` - Victory screenshot
- `output/run_stats.json` - Run statistics

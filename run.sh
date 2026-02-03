#!/bin/bash
set -e
cd "$(dirname "$0")"

# API key is OPTIONAL - LLM only used as fallback
if [ -z "$GEMINI_API_KEY" ]; then
  echo "ℹ️  No GEMINI_API_KEY set - running in pure deterministic mode"
fi

pnpm install
pnpm start

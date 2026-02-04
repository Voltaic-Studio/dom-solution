#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "🤖 Computer Use Agent"
echo ""

if [ -z "$1" ]; then
  echo "Usage: ./run.sh <url> [goal]"
  echo ""
  echo "Example:"
  echo "  ./run.sh https://example.com/challenge"
  echo "  ./run.sh https://example.com/challenge \"complete the form\""
  exit 1
fi

URL="$1"
GOAL="${2:-complete the challenge}"

echo "📦 Installing dependencies..."
pnpm install

echo ""
echo "🎯 URL: $URL"
echo "🎯 Goal: $GOAL"
echo ""

pnpm test "$URL" "$GOAL"

#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "🚀 Browser Challenge Solver - MCP Tool"
echo ""

if [ -z "$1" ]; then
  echo "Usage: ./run.sh <URL>"
  echo ""
  echo "Example:"
  echo "  ./run.sh https://example.com/challenge"
  echo ""
  echo "Other commands:"
  echo "  pnpm test-tool <URL>  - Test the solver"
  echo "  pnpm mcp              - Run as MCP server"
  exit 1
fi

pnpm install
pnpm test-tool "$1"

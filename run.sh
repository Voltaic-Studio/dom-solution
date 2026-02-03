#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "🚀 Browser Challenge Solver"
echo ""

# Default to the challenge URL if none provided
URL="${1:-https://serene-frangipane-7fd25b.netlify.app/}"

echo "📦 Installing dependencies..."
pnpm install

echo ""
echo "🎯 Solving: $URL"
echo ""

pnpm test-tool "$URL"

#!/bin/bash
set -e
cd "$(dirname "$0")"
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm start

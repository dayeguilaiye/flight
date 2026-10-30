#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
pnpm --dir frontend build
test -s internal/web/dist/index.html
touch internal/web/dist/.gitkeep
mkdir -p build
CGO_ENABLED=0 go build -trimpath -ldflags='-s -w' -o build/flight ./cmd/flight

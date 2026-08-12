#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

test -f README.md
grep -q cursor README.md

command -v node >/dev/null
command -v python3 >/dev/null
command -v go >/dev/null
command -v git >/dev/null
command -v curl >/dev/null

echo "Environment bootstrap complete"

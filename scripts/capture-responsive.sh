#!/bin/zsh

set -euo pipefail

exec node scripts/browser-qa.mjs

echo "Responsive screenshots written to $qa_dir"

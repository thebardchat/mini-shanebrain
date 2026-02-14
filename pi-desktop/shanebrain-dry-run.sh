#!/bin/bash
# mini-shanebrain — Preview posts without publishing
PROJECT_DIR="$HOME/mini-shanebrain"
cd "$PROJECT_DIR" || { echo "ERROR: $PROJECT_DIR not found"; read -p "Press Enter..."; exit 1; }
echo "=== DRY RUN — Preview Only ==="
node src/index.js --dry-run
echo ""
read -p "Press Enter to close..."

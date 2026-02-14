#!/bin/bash
# mini-shanebrain — Verify all platform tokens are valid
PROJECT_DIR="$HOME/mini-shanebrain"
cd "$PROJECT_DIR" || { echo "ERROR: $PROJECT_DIR not found"; read -p "Press Enter..."; exit 1; }
echo "=== VERIFYING TOKENS ==="
node src/index.js --verify
echo ""
read -p "Press Enter to close..."

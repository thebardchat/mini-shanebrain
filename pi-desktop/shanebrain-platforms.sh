#!/bin/bash
# mini-shanebrain — Show which platforms are enabled
PROJECT_DIR="$HOME/mini-shanebrain"
cd "$PROJECT_DIR" || { echo "ERROR: $PROJECT_DIR not found"; read -p "Press Enter..."; exit 1; }
echo "=== ENABLED PLATFORMS ==="
node src/index.js --platforms
echo ""
read -p "Press Enter to close..."

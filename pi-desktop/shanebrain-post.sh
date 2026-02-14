#!/bin/bash
# mini-shanebrain — Post to all enabled platforms NOW
PROJECT_DIR="$HOME/mini-shanebrain"
cd "$PROJECT_DIR" || { echo "ERROR: $PROJECT_DIR not found"; read -p "Press Enter..."; exit 1; }
echo "=== POSTING TO ALL PLATFORMS ==="
node src/index.js --post
echo ""
read -p "Press Enter to close..."

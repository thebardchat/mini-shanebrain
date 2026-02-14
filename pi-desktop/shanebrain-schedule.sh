#!/bin/bash
# mini-shanebrain — Start the auto-post scheduler (runs until Ctrl+C)
PROJECT_DIR="$HOME/mini-shanebrain"
cd "$PROJECT_DIR" || { echo "ERROR: $PROJECT_DIR not found"; read -p "Press Enter..."; exit 1; }
echo "=== SCHEDULER — Ctrl+C to stop ==="
node src/index.js --schedule

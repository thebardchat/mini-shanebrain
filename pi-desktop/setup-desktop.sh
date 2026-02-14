#!/bin/bash
# Copies all shanebrain scripts to your Pi desktop and makes them executable
# Run once after cloning: bash pi-desktop/setup-desktop.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DESKTOP="$HOME/Desktop"

mkdir -p "$DESKTOP"

for f in "$SCRIPT_DIR"/shanebrain-*.sh; do
  cp "$f" "$DESKTOP/"
  chmod +x "$DESKTOP/$(basename "$f")"
  echo "Installed: $(basename "$f")"
done

echo ""
echo "Done! You should see 5 scripts on your Desktop."
echo "Double-click any of them to run."

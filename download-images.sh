#!/bin/bash
# Download 30 curated photos from Picsum for branded posts
# These are placeholder backgrounds — replace with AI-generated later
cd /home/shanebrain/mini-shanebrain/images

SEEDS=(
  "shanebrain-core" "neural-network" "raspberry-pi" "code-night" "server-room"
  "faith-sunrise" "golden-light" "lighthouse" "storm-clouds"
  "oak-tree" "warm-home" "family-bond" "wrestling" "footpath"
  "laser-focus" "momentum" "electric" "superpower"
  "highway-dawn" "truck-route" "construction" "concrete"
  "mountain-peak" "phoenix" "clear-water"
  "angel-cloud" "community" "connected"
  "country-road" "porch-sunset"
)

i=1
for seed in "${SEEDS[@]}"; do
  num=$(printf "%02d" $i)
  file="${num}-${seed}.jpg"
  if [ -f "$file" ]; then
    echo "SKIP $file"
  else
    echo "Downloading $file..."
    curl -sL "https://picsum.photos/seed/${seed}/1200/630" -o "$file"
    size=$(stat -c%s "$file" 2>/dev/null || echo 0)
    if [ "$size" -gt 1000 ]; then
      echo "  OK ($((size/1024))KB)"
    else
      echo "  FAIL (too small)"
      rm -f "$file"
    fi
    sleep 1
  fi
  i=$((i+1))
done

echo ""
echo "Total images: $(ls *.jpg 2>/dev/null | wc -l)/30"

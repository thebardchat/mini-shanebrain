#!/bin/bash
# Generate branded book promo images via Pollinations.ai
# Each image is a different style/theme to keep the feed visually diverse
#
# Usage: ./generate-images.sh [count]
#   count: number of images per category (default: 3)

set -e

IMAGES_DIR="$(dirname "$0")/images"
COUNT="${1:-3}"
BOOK_TITLE="You Probably Think This Book Is About You"

# Image categories with different visual styles
declare -A CATEGORIES

CATEGORIES[noir-moody]="Dark moody noir aesthetic, detective desk with scattered manuscript pages, whiskey glass, warm lamplight, shadows, film noir style, cinematic, 1940s detective office atmosphere"
CATEGORIES[book-cover-showcase]="Elegant book display on dark wooden table, dramatic spotlight, scattered noir-style pages, pen and ink, atmospheric smoke wisps, professional book photography"
CATEGORIES[alabama-writer]="Southern small town at dusk, old truck in background, person writing at a porch table, warm golden hour light, rural Alabama aesthetic, authentic blue collar creative"
CATEGORIES[pi-and-pages]="Raspberry Pi single board computer next to an open notebook with handwritten story notes, LED lights glow, cozy tech workspace, creative meets technology"
CATEGORIES[ego-mirror]="Abstract art of multiple faces looking at reflections that show different people, surreal mirror maze, identity and ego concept art, dark moody palette with gold accents"
CATEGORIES[midnight-writing]="Person writing by lamplight at 2 AM, coffee mug, scattered notes, laptop glow, creative insomnia aesthetic, warm moody atmosphere, writer at work"
CATEGORIES[noir-cityscape]="Film noir city street at night, rain-slicked pavement, neon signs reflecting, mysterious figure in shadows, vintage 1940s crime novel cover aesthetic"
CATEGORIES[brain-and-book]="Glowing neural network brain connected to an open book by streams of light, dark background, AI meets literature concept, futuristic meets classic"
CATEGORIES[dispatch-to-author]="Split image: left side shows dispatch office with radio and truck routes, right side shows cozy writing desk with manuscript, two worlds one person"
CATEGORIES[vignette-collage]="Collage of 6 small noir scenes: poker table, courtroom, bar counter, church pew, therapist couch, empty stage — each showing a character who thinks they are the center"

echo "=== ShaneBrain Book Image Generator ==="
echo "Generating $COUNT images per category (${#CATEGORIES[@]} categories)"
echo "Output: $IMAGES_DIR"
echo ""

TOTAL=0
FAILED=0

for category in "${!CATEGORIES[@]}"; do
    prompt="${CATEGORIES[$category]}"

    for i in $(seq 1 "$COUNT"); do
        SEED=$((RANDOM * RANDOM))
        FILENAME="book-promo-${category}-${i}.png"
        FILEPATH="${IMAGES_DIR}/${FILENAME}"

        if [ -f "$FILEPATH" ]; then
            echo "[SKIP] $FILENAME (already exists)"
            continue
        fi

        ENCODED=$(python3 -c "from urllib.parse import quote; print(quote('$prompt'))")
        URL="https://image.pollinations.ai/prompt/${ENCODED}?width=1200&height=630&nologo=true&seed=${SEED}"

        echo -n "[DL] $FILENAME ... "

        if curl -sL --max-time 60 -o "$FILEPATH" "$URL" 2>/dev/null; then
            # Verify it's actually an image
            FILE_TYPE=$(file -b --mime-type "$FILEPATH" 2>/dev/null)
            if [[ "$FILE_TYPE" == image/* ]]; then
                SIZE=$(du -h "$FILEPATH" | cut -f1)
                echo "OK ($SIZE)"
                TOTAL=$((TOTAL + 1))
            else
                echo "FAILED (not an image: $FILE_TYPE)"
                rm -f "$FILEPATH"
                FAILED=$((FAILED + 1))
            fi
        else
            echo "FAILED (download error)"
            rm -f "$FILEPATH"
            FAILED=$((FAILED + 1))
        fi

        # Be polite to the API
        sleep 2
    done
done

echo ""
echo "=== Done ==="
echo "Generated: $TOTAL new images"
echo "Failed: $FAILED"
echo "Total images in folder: $(ls "$IMAGES_DIR"/*.{png,jpg} 2>/dev/null | wc -l)"

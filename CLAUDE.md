# mini-shanebrain — DEPRECATED

> **Status:** DEPRECATED as of February 15, 2026
> **Merged into:** `/mnt/shanebrain-raid/shanebrain-core/social/`

## What Happened

mini-shanebrain was a standalone Node.js Facebook bot. On February 15, 2026, all functionality was ported to Python and merged into shanebrain-core's `social/` module.

## Migration Map

| mini-shanebrain (Node.js) | shanebrain-core/social/ (Python) |
|---------------------------|----------------------------------|
| src/facebook.js | social/facebook_api.py |
| src/ai.js | social/content_generator.py |
| src/index.js | social/fb_bot.py |
| src/scheduler.js | social/fb_bot.py (APScheduler) |
| token-setup.js | social/token_exchange.py |
| N/A (new) | social/comment_harvester.py |
| N/A (new) | social/friend_profiler.py |
| N/A (new) | social/content_calendar.py |

## What's New in the Python Version

- **Weaviate integration** — every comment/reaction is vectorized and searchable
- **Friend profiling** — builds living profiles of everyone who interacts
- **Sentiment analysis** — Ollama-powered + keyword fallback
- **7-day content calendar** — themed posting (Mission Monday → Family Sunday)
- **Pollinations.ai** — free AI-generated images
- **Unified with Discord** — both platforms feed same Weaviate collections

## Do Not Use This Repo

Use `python -m social.fb_bot` from `/mnt/shanebrain-raid/shanebrain-core/` instead.

This repo is kept as a reference only.

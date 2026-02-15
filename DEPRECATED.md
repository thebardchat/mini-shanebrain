# DEPRECATED

**mini-shanebrain has been merged into shanebrain-core.**

As of February 15, 2026, all Facebook bot functionality has been ported to Python and lives in:

```
/mnt/shanebrain-raid/shanebrain-core/social/
```

## What moved where

| mini-shanebrain (Node.js) | shanebrain-core (Python) |
|---------------------------|--------------------------|
| src/facebook.js | social/facebook_api.py |
| src/token-setup.js | social/token_exchange.py |
| src/ai.js | social/content_generator.py |
| src/scheduler.js | social/fb_bot.py (APScheduler) |
| src/index.js | social/fb_bot.py (CLI) |
| .env (Facebook creds) | shanebrain-core/.env |

## What's new in the Python version

- Weaviate integration (SocialKnowledge + FriendProfile collections)
- Comment harvesting with sentiment analysis
- Friend profiling with relationship strength tracking
- 7-day themed content calendar
- Pollinations.ai image generation
- systemd service for always-on operation

## How to use the new version

```bash
cd /mnt/shanebrain-raid/shanebrain-core
python -m social.fb_bot --help
```

This repo is kept as a reference. Do not use it for production.

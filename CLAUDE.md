# mini-shanebrain

A quick-win Facebook automation bot for the ADHD brain. Run it, forget it, let it handle one social platform for a few weeks.

## Architecture

- **Runtime**: Node.js (ES modules)
- **AI Backend**: Claude API (primary) or Ollama (local fallback)
- **Platform**: Facebook Graph API v21.0

## File Structure

```
src/
  facebook.js  - Graph API wrapper (post, get engagement)
  ai.js        - Content generation (Claude or Ollama)
  index.js     - CLI entry point
  scheduler.js - Cron-based auto-posting
logs/          - Post history and errors (gitignored)
```

## Key API Endpoints

- POST `/{page-id}/feed` - Create a post
- GET `/{page-id}/posts` - Read recent posts
- GET `/{post-id}?fields=likes,comments` - Get engagement

## Environment

All secrets live in `.env` (never committed). Copy `.env.example` to get started.

## Commands

```bash
npm run dry-run   # Preview what would post (safe)
npm run post      # Post once immediately
npm run schedule  # Run continuously on cron schedule
```

## Rules

1. Never commit .env or any tokens
2. Always test with --dry-run first
3. Respect Facebook rate limits (200 posts/hour max, but we post 3x/day)
4. Keep posts authentic to the page personality

# mini-shanebrain

A quick win for the ADHD brain to control one Social for a couple of weeks.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy the example env and fill in your credentials
cp .env.example .env

# 3. Test your setup
node src/index.js --verify

# 4. Try a dry run (no actual posting)
npm run dry-run

# 5. Post for real
npm run post

# 6. Run on autopilot
npm run schedule
```

## What You Need

1. **Facebook Page** you manage
2. **Meta Developer Account** at [developers.facebook.com](https://developers.facebook.com)
3. **Anthropic API Key** from [console.anthropic.com](https://console.anthropic.com) (or run Ollama locally)

See [MINI-SHANEBRAIN-SETUP.md](https://github.com/thebardchat/mini-shanebrain/blob/main/MINI-SHANEBRAIN-SETUP.md) for the full token setup walkthrough.

## Commands

| Command | What it does |
|---------|--------------|
| `npm run dry-run` | Generate a post, preview it, don't publish |
| `npm run post` | Generate and publish one post now |
| `npm run schedule` | Run continuously, posting on schedule |
| `--verify` | Check if your Facebook token works |
| `--ideas` | Generate 5 post ideas |

## Configuration

Edit `.env` to customize:

```env
PAGE_PERSONALITY=a friendly tech enthusiast sharing tips
POST_SCHEDULE=0 9,14,19 * * *   # 9am, 2pm, 7pm daily
```

## Logs

All posts (attempted and published) are logged to `logs/posts.log`

## Switching to Local AI (Ollama)

If you don't want to use Claude API:

1. Install [Ollama](https://ollama.ai)
2. Pull a model: `ollama pull llama3.2`
3. Set in `.env`:
   ```
   USE_OLLAMA=true
   OLLAMA_MODEL=llama3.2
   ```

## License

MIT - do whatever you want with it.

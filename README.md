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

---

**Built by:** Shane Brazelton + Claude Anthropic (ShaneBrain ecosystem, Hazel Green AL)

**Constitution:** This project operates under the [ShaneBrain Constitution](https://github.com/thebardchat/constitution/blob/main/CONSTITUTION.md). See [CONSTITUTION.md](./CONSTITUTION.md).

**GitHub Pages:** [thebardchat.github.io/mini-shanebrain](https://thebardchat.github.io/mini-shanebrain/)

---

Built with [Claude + ShaneBrain](https://claude.ai/referral/4fAMYN9Ing) — AI tools for humans who build.

---

<div align="center">

[![Pulsar Sentinel — Quantum Security](https://raw.githubusercontent.com/thebardchat/pulsar_sentinel/main/quantum-banner.gif)](https://sentinel.shanebrain.cloud)

### ⚡ Pulsar Sentinel — Quantum Security for the Rest of Us

[![LIVE](https://img.shields.io/badge/LIVE-sentinel.shanebrain.cloud-00f0ff?style=for-the-badge)](https://sentinel.shanebrain.cloud)
[![PQC](https://img.shields.io/badge/ML--KEM--768-Post--Quantum-ff00ff?style=for-the-badge)](https://sentinel.shanebrain.cloud)
[![From $10.99/mo](https://img.shields.io/badge/From-$10.99%2Fmo-ffd700?style=for-the-badge)](https://sentinel.shanebrain.cloud/#pricing)

**800 million Windows computers just lost security updates.**
Pulsar Sentinel wraps them in ML-KEM post-quantum encryption, immutable blockchain audit trails, and automatic digital inheritance — no lawyers, no cloud dependency, no corporate kill switch.

**[→ Get Protected at sentinel.shanebrain.cloud](https://sentinel.shanebrain.cloud)**

*Built by Shane Brazelton + Claude (Anthropic) · Hazel Green, Alabama*

[![Built with Claude](https://img.shields.io/badge/Built%20with-Claude%20by%20Anthropic-orange?style=flat)](https://claude.ai/referral/4fAMYN9Ing)

</div>

---

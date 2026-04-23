/**
 * AI Content Generator
 * Uses Claude API or local Ollama for generating social media posts
 * Mix of Shane's quotes and AI-generated thoughts — kept short and real
 */

import Anthropic from '@anthropic-ai/sdk';
import { queryKnowledge } from './weaviate.js';
import { getRandomQuote, getQuoteByCategory, QUOTES } from './quotes.js';
import { getVerifiedImage } from './image.js';

const SIGNOFF = '\n\n— Shane // ShaneBrain 🧠';
const BOOK_URL = 'https://www.amazon.com/Probably-Think-This-Book-About/dp/B0GT25R5FD';

const PLATFORM_RULES = {
  facebook: `- No hashtags unless they feel natural
- No emojis overload (1-2 max if any)
- Don't start with "Hey everyone" or similar generic openers
- Make it feel like a real person wrote it`,

  instagram: `- Include 2-5 relevant hashtags at the end
- Keep it punchy, short paragraphs or single lines
- Emojis are welcome (2-4)
- Make it scroll-stopping`,

  linkedin: `- Professional but human tone
- No hashtags in the body (3 max at the very end if any)
- Share an insight, lesson, or perspective
- No emojis`,

  x: `- Must be under 280 characters total including signoff (this is critical)
- Short, punchy, conversational
- No hashtags unless extremely relevant (1 max)
- One thought — don't try to say too much`,

  threads: `- Casual and conversational (like texting)
- Keep it tight
- Emojis welcome but don't overdo it (1-2)
- No hashtags`,

  bluesky: `- Community-focused, genuine tone
- Can include tech talk (the audience is techy)
- No hashtags (Bluesky doesn't use them)
- Write like you're talking to a friend who gets tech`
};

export class ContentGenerator {
  constructor(config) {
    this.useOllama = config.useOllama === 'true';
    this.personality = config.personality || 'a friendly person sharing thoughts';

    if (this.useOllama) {
      this.ollamaUrl = config.ollamaUrl || 'http://localhost:11434';
      this.ollamaModel = config.ollamaModel || 'llama3.2';
    } else {
      if (!config.anthropicKey) {
        throw new Error('Missing ANTHROPIC_API_KEY in .env');
      }
      this.anthropic = new Anthropic({ apiKey: config.anthropicKey });
    }
  }

  /**
   * Generate a post for a specific platform.
   * ~40% chance of just posting a quote (fast, no AI call).
   * ~60% chance of AI-generated short thought.
   */
  async generatePost(options = {}) {
    const { topic, mood, maxLength = 280, platform = 'facebook' } = options;

    // 30% chance: book promo quote — drives traffic to Amazon
    if (!topic && Math.random() < 0.3) {
      const bookQuotes = QUOTES.book || [];
      if (bookQuotes.length > 0) {
        return bookQuotes[Math.floor(Math.random() * bookQuotes.length)];
      }
    }

    // 30% chance: just a quote — fast, authentic, zero AI latency
    if (!topic && Math.random() < 0.43) { // 0.43 of remaining 70% ≈ 30% overall
      const quote = getRandomQuote();
      return quote;
    }

    // 60% chance: AI-generated short thought
    const ragQuery = topic || this.personality;
    const ragContext = await queryKnowledge(ragQuery);
    const prompt = this.buildPrompt({ topic, mood, maxLength, platform, ragContext });

    if (this.useOllama) {
      return this.generateWithOllama(prompt);
    } else {
      return this.generateWithClaude(prompt);
    }
  }

  /**
   * Generate posts for ALL platforms using one core idea.
   * One Ollama call (or quote pick), then adapt per platform.
   * Returns { facebook: "post text", x: "post text", ... }
   */
  async generateAllPosts(platforms, { topic, mood } = {}) {
    const sigLen = SIGNOFF.length;

    // Generate one core post
    const corePost = await this.generatePost({
      platform: 'facebook',
      maxLength: 400 - sigLen,
      topic,
      mood
    });

    // Adapt for each platform
    const posts = {};
    for (const p of platforms) {
      const maxLen = p.maxLength - sigLen;
      let text = corePost;

      switch (p.name) {
        case 'x':
          // Trim to fit 280 chars total with signoff
          if (text.length > maxLen) {
            const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
            text = '';
            for (const s of sentences) {
              if ((text + s).length <= maxLen) {
                text += s;
              } else break;
            }
            if (!text) text = corePost.substring(0, maxLen - 3) + '...';
          }
          break;

        case 'bluesky':
        case 'threads':
          // Trim to platform limit
          if (text.length > maxLen) {
            const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
            text = '';
            for (const s of sentences) {
              if ((text + s).length <= maxLen) {
                text += s;
              } else break;
            }
            if (!text) text = corePost.substring(0, maxLen - 3) + '...';
          }
          break;

        default:
          // Facebook, LinkedIn, Instagram — use as-is, just truncate if needed
          if (text.length > maxLen) text = text.substring(0, maxLen - 3) + '...';
          break;
      }

      posts[p.name] = { text: text.trim() + SIGNOFF };
    }

    // Get ONE verified image for all platforms
    const image = await getVerifiedImage(corePost);
    for (const name of Object.keys(posts)) {
      posts[name].image = image; // { type: 'local'|'url', value: path_or_url }
    }

    return posts;
  }

  buildPrompt({ topic, mood, maxLength, platform = 'facebook', ragContext = '' }) {
    const rules = PLATFORM_RULES[platform] || PLATFORM_RULES.facebook;

    // Feed it a random quote as a voice/tone example
    const exampleQuote = getRandomQuote();

    let prompt = `You are ${this.personality}.

Write a SHORT social media post (1-3 sentences max). Keep it punchy. Don't write an essay.

Here's an example of your voice and tone: "${exampleQuote}"`;

    if (ragContext) {
      prompt += `\n\nBackground knowledge to draw from (don't copy, let it inspire you):\n${ragContext}`;
    }

    prompt += `\n\nRules:
- KEEP IT SHORT. 1-3 sentences. That's it.
- Keep it under ${maxLength} characters
- Be raw, real, and honest — struggles and wins both
- Mention God, faith, sobriety, ADHD, fatherhood when it fits naturally
- You can mention ShaneBrain — the AI legacy project built with Claude on a Raspberry Pi
- You can invite people to join the Discord #feed-the-brain channel to contribute knowledge
- ~30% of posts should mention the book "You Probably Think This Book Is About You" — noir vignettes about ego and identity, co-written with Claude AI. Always include the link: ${BOOK_URL}
- When mentioning the book, weave it naturally — don't make it feel like an ad. Connect it to the post's theme
- Do NOT use kids' real names — say "my oldest", "my youngest", etc
- Do NOT write about space, rockets, BGKPJR, maglev, or spacecraft
- Do NOT include preamble — just the post itself
- Do NOT wrap in quotes
${rules}`;

    if (topic) prompt += `\n- Topic: ${topic}`;
    if (mood) prompt += `\n- Mood/tone: ${mood}`;

    prompt += `\n\nRespond with ONLY the post text. Short. Real. Go.`;

    return prompt;
  }

  async generateWithClaude(prompt) {
    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0]?.text?.trim();
    if (!text) throw new Error('Claude returned empty response');
    return text;
  }

  async generateWithOllama(prompt) {
    const response = await fetch(`${this.ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.ollamaModel,
        prompt,
        stream: false,
        options: { temperature: 0.8, num_predict: 256 }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}. Is Ollama running?`);
    }

    const data = await response.json();
    let text = data.response?.trim();
    if (!text) throw new Error('Ollama returned empty response');

    // Strip preamble
    text = text.replace(/^.*(?:here'?s|sure|okay|here is|here you go|of course|absolutely).*?[:\n]/i, '').trim();
    // Strip wrapping quotes
    if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
      text = text.slice(1, -1).trim();
    }
    if (text.startsWith('"') && !text.includes('"', 1)) {
      text = text.slice(1).trim();
    }

    return text;
  }

  async generateIdeas(count = 5) {
    const prompt = `You are ${this.personality}. Generate ${count} distinct social media post ideas.
Each should be a 1-line description. Varied topics. Authentic. Numbered 1-${count}. Just the ideas.`;

    if (this.useOllama) {
      return this.generateWithOllama(prompt);
    } else {
      return this.generateWithClaude(prompt);
    }
  }
}

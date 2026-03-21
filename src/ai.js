/**
 * AI Content Generator
 * Uses Claude API or local Ollama for generating social media posts
 */

import Anthropic from '@anthropic-ai/sdk';
import { queryKnowledge } from './weaviate.js';

const BOOK_METADATA = {
  title: 'You Probably Think This Book Is About You',
  author: 'Shane Brazelton',
  tagline: 'It was always about you. It was never only about you.',
  amazonUrl: 'https://www.amazon.com/dp/B0GT25R5FD',
  landingPage: 'https://thebardchat.github.io/book',
  socialImage: 'https://thebardchat.github.io/book/social-launch.png',
  formats: 'Ebook, Audiobook, Print',
  genre: '22 noir-style vignettes about ego, identity, and the universal human condition',
  location: 'Hazel Green, Alabama',
  excerpts: [
    `"It's your favorite movie, and you're the lead character. You always have been. The camera follows you — has always followed you — through every dimly lit hallway, every kitchen argument, every moment you sat alone in a car in a parking lot wondering how the plot got this complicated."`,
    `"A brain that runs at a frequency most equipment wasn't built to measure. Not broken — miscalibrated for a world that moves slower than it does."`,
    `"The detective closes the file. Not because the case is solved. Because some cases aren't meant to be solved. Some cases are meant to be driven."`,
    `"The driveway. Engine off. The house glows from inside like something patient. He doesn't get out yet. Between the road and the door there is a version of him that belongs to neither — not the driver, not the father. Just the man."`
  ]
};

export { BOOK_METADATA };

const PLATFORM_RULES = {
  facebook: `- No hashtags unless they feel natural
- No emojis overload (1-2 max if any)
- Don't start with "Hey everyone" or similar generic openers
- Make it feel like a real person wrote it`,

  instagram: `- Include 2-5 relevant hashtags at the end
- Write visually — describe what the image could show
- Keep it punchy, short paragraphs or single lines
- Emojis are welcome (2-4)
- Make it scroll-stopping`,

  linkedin: `- Professional but human tone
- No hashtags in the body (3 max at the very end if any)
- End with a question or call-to-action
- Share an insight, lesson, or perspective
- No emojis`
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
   * Generate a post for a specific platform
   * @param {object} options
   * @param {string} options.platform - 'facebook' | 'instagram' | 'linkedin'
   */
  async generatePost(options = {}) {
    const { topic, mood, maxLength = 280, platform = 'facebook' } = options;

    // Pull context from Weaviate RAG if available
    const ragQuery = topic || this.personality;
    const ragContext = await queryKnowledge(ragQuery);

    const prompt = this.buildPrompt({ topic, mood, maxLength, platform, ragContext });

    if (this.useOllama) {
      return this.generateWithOllama(prompt);
    } else {
      return this.generateWithClaude(prompt);
    }
  }

  buildPrompt({ topic, mood, maxLength, platform = 'facebook', ragContext = '' }) {
    const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
    const rules = PLATFORM_RULES[platform] || PLATFORM_RULES.facebook;

    let prompt = `You are ${this.personality}. Write a single ${platformName} post.`;

    if (ragContext) {
      prompt += `\n\nUse this background knowledge to inspire the post (don't copy it verbatim, just let it inform your voice and topics):\n${ragContext}`;
    }

    prompt += `\n\nRules:
- Keep it under ${maxLength} characters
- Be authentic and conversational
- NEVER share private family details, personal struggles, or anyone's health/recovery info
- Keep it professional — this is a public business page
- Do NOT include any preamble like "Here's the post:" — just write the post itself
${rules}`;

    if (topic) {
      prompt += `\n- Topic: ${topic}`;
    }

    if (mood) {
      prompt += `\n- Mood/tone: ${mood}`;
    }

    prompt += `\n\nRespond with ONLY the post text. No quotes, no preamble, no commentary.`;

    return prompt;
  }

  async generateWithClaude(prompt) {
    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0]?.text?.trim();
    if (!text) {
      throw new Error('Claude returned empty response');
    }

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
        options: { temperature: 0.8 }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}. Is Ollama running?`);
    }

    const data = await response.json();
    let text = data.response?.trim();

    if (!text) {
      throw new Error('Ollama returned empty response');
    }

    // Strip preamble lines like "Here's the post:" or "Sure!"
    text = text.replace(/^.*(?:here'?s|sure|okay|here is).*?[:\n]/i, '').trim();
    // Strip wrapping quotes
    if (text.startsWith('"') && text.endsWith('"')) {
      text = text.slice(1, -1).trim();
    }

    return text;
  }

  /**
   * Generate a book promotion post for a specific platform
   */
  async generateMediaBlitzPost(options = {}) {
    const { platform = 'facebook', maxLength = 280 } = options;
    const prompt = this.buildMediaBlitzPrompt({ platform, maxLength });

    if (this.useOllama) {
      return this.generateWithOllama(prompt);
    } else {
      return this.generateWithClaudeBlitz(prompt);
    }
  }

  buildMediaBlitzPrompt({ platform = 'facebook', maxLength = 280 }) {
    const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
    const rules = PLATFORM_RULES[platform] || PLATFORM_RULES.facebook;
    const book = BOOK_METADATA;

    // Pick 1-2 random excerpts
    const shuffled = [...book.excerpts].sort(() => Math.random() - 0.5);
    const selectedExcerpts = shuffled.slice(0, platform === 'instagram' ? 1 : 2);

    let prompt = `You are ${this.personality}. Write a single ${platformName} post promoting your book.

BOOK DETAILS:
- Title: "${book.title}"
- Author: ${book.author}
- Tagline: "${book.tagline}"
- Genre: ${book.genre}
- Amazon: ${book.amazonUrl}
- Landing page: ${book.landingPage}
- Available as: ${book.formats}
- Written by a dispatcher, father of five, and AI architect from ${book.location}

SAMPLE EXCERPTS (use one or weave in the vibe):
${selectedExcerpts.join('\n\n')}

Rules:
- Keep it under ${maxLength} characters
- This is a book promotion but should NOT feel like an ad
- Be authentic — this is a real person sharing something they created
- Include the Amazon link naturally
- Do NOT include any preamble like "Here's the post:" — just write the post itself
${rules}`;

    prompt += `\n\nRespond with ONLY the post text. No quotes, no preamble, no commentary.`;

    return prompt;
  }

  async generateWithClaudeBlitz(prompt) {
    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0]?.text?.trim();
    if (!text) {
      throw new Error('Claude returned empty response');
    }
    return text;
  }

  /**
   * Generate a newsletter-style email body for the book
   */
  async generateEmailBlitz() {
    const book = BOOK_METADATA;
    const prompt = `You are ${this.personality}. Write a short, personal newsletter email promoting your book.

BOOK DETAILS:
- Title: "${book.title}"
- Author: ${book.author}
- Tagline: "${book.tagline}"
- Genre: ${book.genre}
- Amazon: ${book.amazonUrl}
- Landing page: ${book.landingPage}
- Available as: ${book.formats}
- Written by a dispatcher, father of five, and AI architect from ${book.location}

EXCERPTS:
${book.excerpts.join('\n\n')}

Rules:
- Write a personal, warm email from Shane to friends/readers
- Include 1-2 excerpts woven in naturally
- Include the Amazon link and landing page link
- Keep it under 1500 characters
- Subject line first, then a blank line, then the body
- No HTML, just plain text
- Do NOT include preamble — just write the email

Respond with ONLY the email (subject line first, then body).`;

    if (this.useOllama) {
      return this.generateWithOllama(prompt);
    } else {
      return this.generateWithClaudeBlitz(prompt);
    }
  }

  /**
   * Generate multiple post ideas
   */
  async generateIdeas(count = 5) {
    const prompt = `You are ${this.personality}. Generate ${count} distinct social media post ideas.

Each idea should be:
- A brief 1-line description of what the post would be about
- Varied in topic and tone
- Authentic to the personality

Format: One idea per line, numbered 1-${count}. Just the ideas, no extra text.`;

    if (this.useOllama) {
      return this.generateWithOllama(prompt);
    } else {
      return this.generateWithClaude(prompt);
    }
  }
}

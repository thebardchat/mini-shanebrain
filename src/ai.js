/**
 * AI Content Generator
 * Uses Claude API or local Ollama for generating Facebook posts
 */

import Anthropic from '@anthropic-ai/sdk';

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
   * Generate a Facebook post
   */
  async generatePost(options = {}) {
    const { topic, mood, maxLength = 280 } = options;

    const prompt = this.buildPrompt({ topic, mood, maxLength });

    if (this.useOllama) {
      return this.generateWithOllama(prompt);
    } else {
      return this.generateWithClaude(prompt);
    }
  }

  buildPrompt({ topic, mood, maxLength }) {
    let prompt = `You are ${this.personality}. Write a single Facebook post.

Rules:
- Keep it under ${maxLength} characters
- Be authentic and conversational
- No hashtags unless they feel natural
- No emojis overload (1-2 max if any)
- Don't start with "Hey everyone" or similar generic openers
- Make it feel like a real person wrote it`;

    if (topic) {
      prompt += `\n- Topic: ${topic}`;
    }

    if (mood) {
      prompt += `\n- Mood/tone: ${mood}`;
    }

    prompt += `\n\nWrite only the post text, nothing else.`;

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
    const text = data.response?.trim();

    if (!text) {
      throw new Error('Ollama returned empty response');
    }

    return text;
  }

  /**
   * Generate multiple post ideas
   */
  async generateIdeas(count = 5) {
    const prompt = `You are ${this.personality}. Generate ${count} distinct Facebook post ideas.

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

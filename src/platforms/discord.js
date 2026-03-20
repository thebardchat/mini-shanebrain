/**
 * Discord platform - Webhook-based posting
 * No bot token needed — just webhook URLs per channel
 * Create webhooks in Discord: Server Settings > Integrations > Webhooks
 */

import { BasePlatform } from './base.js';

export class DiscordPlatform extends BasePlatform {
  constructor(webhookUrl, botName = 'ShaneBrain') {
    super({ name: 'discord', maxLength: 2000 });
    if (!webhookUrl) {
      throw new Error('Missing DISCORD_WEBHOOK_URL in .env');
    }
    this.webhookUrl = webhookUrl;
    this.botName = botName;
    // Additional channel webhooks for targeted posting
    this.channelWebhooks = {};
  }

  /**
   * Register additional channel webhooks
   * @param {string} channel - Channel name (e.g., 'track-drops', 'the-case-file')
   * @param {string} webhookUrl - Discord webhook URL for that channel
   */
  addChannel(channel, webhookUrl) {
    this.channelWebhooks[channel] = webhookUrl;
  }

  /**
   * Post a message to Discord via webhook
   * @param {string} message - Message content (markdown supported)
   * @param {object} options - { channel, embed }
   */
  async post(message, options = {}) {
    const url = options.channel
      ? (this.channelWebhooks[options.channel] || this.webhookUrl)
      : this.webhookUrl;

    const body = {
      username: this.botName,
      content: message
    };

    // Rich embed support for book excerpts, track drops, etc.
    if (options.embed) {
      body.embeds = [options.embed];
      if (!message) delete body.content;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      throw new Error(`Discord webhook error (${response.status}): ${errText}`);
    }

    return { success: true, postId: `discord-${Date.now()}`, message };
  }

  /**
   * Post a rich embed (for book excerpts, track drops, announcements)
   */
  async postEmbed({ title, description, color = 0xc9a84c, fields = [], footer, imageUrl, url }) {
    const embed = {
      title,
      description,
      color,
      fields,
      timestamp: new Date().toISOString()
    };

    if (footer) embed.footer = { text: footer };
    if (imageUrl) embed.image = { url: imageUrl };
    if (url) embed.url = url;

    return this.post(null, { embed });
  }

  async verifyToken() {
    // Webhooks don't have a verify endpoint, but we can test with a dry request
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: this.botName,
          content: '' // Empty content will fail gracefully
        })
      });

      // Discord returns 400 for empty content but 401/403 for bad webhooks
      if (response.status === 401 || response.status === 403) {
        return { valid: false, error: 'Invalid webhook URL' };
      }

      return { valid: true, name: 'Discord Webhook', id: this.webhookUrl.split('/').pop() };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }
}

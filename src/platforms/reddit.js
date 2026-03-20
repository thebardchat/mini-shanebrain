/**
 * Reddit platform - OAuth2 API wrapper
 * Requires app at reddit.com/prefs/apps (script type)
 */

import { BasePlatform } from './base.js';

const REDDIT_API_BASE = 'https://oauth.reddit.com';
const REDDIT_AUTH_URL = 'https://www.reddit.com/api/v1/access_token';

export class RedditPlatform extends BasePlatform {
  constructor(clientId, clientSecret, username, password, userAgent) {
    super({ name: 'reddit', maxLength: 40000 });
    if (!clientId || !clientSecret) {
      throw new Error('Missing REDDIT_CLIENT_ID or REDDIT_CLIENT_SECRET in .env');
    }
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.username = username;
    this.password = password;
    this.userAgent = userAgent || 'mini-shanebrain:v2.0.0 (by /u/thebardchat)';
    this.accessToken = null;
    this.tokenExpiry = 0;
  }

  async authenticate() {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return;
    }

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const response = await fetch(REDDIT_AUTH_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': this.userAgent
      },
      body: `grant_type=password&username=${encodeURIComponent(this.username)}&password=${encodeURIComponent(this.password)}`
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(`Reddit auth error: ${data.error}`);
    }

    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // refresh 1min early
  }

  /**
   * Post to a subreddit (self/text post)
   * @param {string} message - Post body text (markdown)
   * @param {object} options - { subreddit, title }
   */
  async post(message, options = {}) {
    await this.authenticate();

    const subreddit = options.subreddit || this.defaultSubreddit || 'test';
    const title = options.title || message.substring(0, 100);

    const response = await fetch(`${REDDIT_API_BASE}/api/submit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': this.userAgent
      },
      body: new URLSearchParams({
        sr: subreddit,
        kind: 'self',
        title,
        text: message,
        api_type: 'json'
      })
    });

    const data = await response.json();

    if (data.json?.errors?.length > 0) {
      throw new Error(`Reddit API Error: ${data.json.errors.map(e => e[1]).join(', ')}`);
    }

    const postUrl = data.json?.data?.url || 'posted';
    return { success: true, postId: postUrl, message };
  }

  /**
   * Post a comment on an existing thread
   */
  async comment(thingId, message) {
    await this.authenticate();

    const response = await fetch(`${REDDIT_API_BASE}/api/comment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': this.userAgent
      },
      body: new URLSearchParams({
        thing_id: thingId,
        text: message,
        api_type: 'json'
      })
    });

    const data = await response.json();

    if (data.json?.errors?.length > 0) {
      throw new Error(`Reddit comment error: ${data.json.errors.map(e => e[1]).join(', ')}`);
    }

    return { success: true };
  }

  async verifyToken() {
    try {
      await this.authenticate();

      const response = await fetch(`${REDDIT_API_BASE}/api/v1/me`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'User-Agent': this.userAgent
        }
      });

      const data = await response.json();

      if (data.error) {
        return { valid: false, error: data.message || data.error };
      }

      return { valid: true, name: data.name, id: data.id };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }
}

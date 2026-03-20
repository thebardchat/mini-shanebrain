/**
 * X/Twitter platform - API v2 with OAuth 2.0 Bearer Token
 * Requires developer account at developer.twitter.com
 */

import { BasePlatform } from './base.js';

const TWITTER_API_BASE = 'https://api.twitter.com/2';

export class TwitterPlatform extends BasePlatform {
  constructor(bearerToken, apiKey, apiSecret, accessToken, accessTokenSecret) {
    super({ name: 'twitter', maxLength: 280 });
    if (!bearerToken && !accessToken) {
      throw new Error('Missing TWITTER_BEARER_TOKEN or TWITTER_ACCESS_TOKEN in .env');
    }
    this.bearerToken = bearerToken;
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.accessToken = accessToken;
    this.accessTokenSecret = accessTokenSecret;
  }

  /**
   * Build OAuth 1.0a signature for user-context endpoints (posting)
   * For simplicity, we use the OAuth 2.0 user access token approach
   */
  async post(message) {
    const url = `${TWITTER_API_BASE}/tweets`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.bearerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: message })
    });

    const data = await response.json();

    if (data.errors || !response.ok) {
      const errMsg = data.errors?.[0]?.message || data.detail || response.statusText;
      throw new Error(`Twitter API Error (${response.status}): ${errMsg}`);
    }

    return { success: true, postId: data.data?.id, message };
  }

  /**
   * Post a thread (array of tweets)
   */
  async postThread(messages) {
    const results = [];
    let replyToId = null;

    for (const message of messages) {
      const body = { text: message };
      if (replyToId) {
        body.reply = { in_reply_to_tweet_id: replyToId };
      }

      const response = await fetch(`${TWITTER_API_BASE}/tweets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (data.errors || !response.ok) {
        const errMsg = data.errors?.[0]?.message || data.detail || response.statusText;
        throw new Error(`Twitter thread error at tweet ${results.length + 1}: ${errMsg}`);
      }

      replyToId = data.data?.id;
      results.push({ postId: replyToId, message });
    }

    return { success: true, threadLength: results.length, tweets: results };
  }

  async verifyToken() {
    const url = `${TWITTER_API_BASE}/users/me`;

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${this.bearerToken}` }
    });

    const data = await response.json();

    if (!response.ok || data.errors) {
      return { valid: false, error: data.errors?.[0]?.message || 'Invalid token' };
    }

    return { valid: true, name: data.data?.username, id: data.data?.id };
  }
}

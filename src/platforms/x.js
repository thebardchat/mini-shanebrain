/**
 * X (Twitter) platform - API v2 with OAuth 1.0a
 * Free tier: 500 posts/month
 * npm install oauth-1.0a
 */

import { BasePlatform } from './base.js';
import crypto from 'crypto';

const X_API_BASE = 'https://api.twitter.com/2';

export class XPlatform extends BasePlatform {
  constructor(apiKey, apiSecret, accessToken, accessTokenSecret) {
    super({ name: 'x', maxLength: 280 });
    if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
      throw new Error('Missing X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, or X_ACCESS_TOKEN_SECRET in .env');
    }
    this.consumer = { key: apiKey, secret: apiSecret };
    this.token = { key: accessToken, secret: accessTokenSecret };
  }

  /**
   * Generate OAuth 1.0a signature and Authorization header.
   * X API v2 signs over URL + method only (body is NOT included in signature).
   */
  _getAuthHeader(url, method) {
    const nonce = crypto.randomBytes(16).toString('hex');
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const params = {
      oauth_consumer_key: this.consumer.key,
      oauth_nonce: nonce,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp,
      oauth_token: this.token.key,
      oauth_version: '1.0',
    };

    // Build signature base string
    const paramStr = Object.keys(params)
      .sort()
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
      .join('&');

    const baseStr = [
      method.toUpperCase(),
      encodeURIComponent(url),
      encodeURIComponent(paramStr),
    ].join('&');

    const signingKey = `${encodeURIComponent(this.consumer.secret)}&${encodeURIComponent(this.token.secret)}`;
    const signature = crypto.createHmac('sha1', signingKey).update(baseStr).digest('base64');

    params.oauth_signature = signature;

    const header = 'OAuth ' + Object.keys(params)
      .sort()
      .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(params[k])}"`)
      .join(', ');

    return header;
  }

  async post(message) {
    const url = `${X_API_BASE}/tweets`;
    const auth = this._getAuthHeader(url, 'POST');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: message }),
    });

    const data = await response.json();

    if (!response.ok) {
      const msg = data.detail || data.title || JSON.stringify(data.errors || data);
      throw new Error(`X API Error (${response.status}): ${msg}`);
    }

    return { success: true, postId: data.data?.id, message };
  }

  async verifyToken() {
    const url = `${X_API_BASE}/users/me`;
    const auth = this._getAuthHeader(url, 'GET');

    const response = await fetch(url, {
      headers: { 'Authorization': auth },
    });

    const data = await response.json();

    if (!response.ok || data.errors) {
      return { valid: false, error: data.detail || data.errors?.[0]?.message || 'Invalid credentials' };
    }

    return { valid: true, name: `@${data.data?.username}`, id: data.data?.id };
  }
}

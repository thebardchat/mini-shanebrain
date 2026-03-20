/**
 * Bluesky platform - AT Protocol
 * Uses the public Bluesky PDS at bsky.social
 */

import { BasePlatform } from './base.js';

const BSKY_API_BASE = 'https://bsky.social/xrpc';

export class BlueskyPlatform extends BasePlatform {
  constructor(handle, appPassword) {
    super({ name: 'bluesky', maxLength: 300 });
    if (!handle || !appPassword) {
      throw new Error('Missing BLUESKY_HANDLE or BLUESKY_APP_PASSWORD in .env');
    }
    this.handle = handle;
    this.appPassword = appPassword;
    this.accessJwt = null;
    this.did = null;
    this.sessionExpiry = 0;
  }

  async createSession() {
    if (this.accessJwt && Date.now() < this.sessionExpiry) {
      return;
    }

    const response = await fetch(`${BSKY_API_BASE}/com.atproto.server.createSession`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: this.handle,
        password: this.appPassword
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(`Bluesky auth error: ${data.message || data.error}`);
    }

    this.accessJwt = data.accessJwt;
    this.did = data.did;
    // Sessions last ~2 hours, refresh at 90 min
    this.sessionExpiry = Date.now() + (90 * 60 * 1000);
  }

  /**
   * Detect facets (links, mentions, hashtags) in post text
   */
  detectFacets(text) {
    const facets = [];

    // URL detection
    const urlRegex = /https?:\/\/[^\s)]+/g;
    let match;
    while ((match = urlRegex.exec(text)) !== null) {
      const byteStart = Buffer.byteLength(text.substring(0, match.index), 'utf8');
      const byteEnd = byteStart + Buffer.byteLength(match[0], 'utf8');
      facets.push({
        index: { byteStart, byteEnd },
        features: [{ $type: 'app.bsky.richtext.facet#link', uri: match[0] }]
      });
    }

    // Hashtag detection
    const hashtagRegex = /#(\w+)/g;
    while ((match = hashtagRegex.exec(text)) !== null) {
      const byteStart = Buffer.byteLength(text.substring(0, match.index), 'utf8');
      const byteEnd = byteStart + Buffer.byteLength(match[0], 'utf8');
      facets.push({
        index: { byteStart, byteEnd },
        features: [{ $type: 'app.bsky.richtext.facet#tag', tag: match[1] }]
      });
    }

    return facets;
  }

  async post(message) {
    await this.createSession();

    const facets = this.detectFacets(message);

    const record = {
      $type: 'app.bsky.feed.post',
      text: message,
      createdAt: new Date().toISOString(),
      langs: ['en']
    };

    if (facets.length > 0) {
      record.facets = facets;
    }

    const response = await fetch(`${BSKY_API_BASE}/com.atproto.repo.createRecord`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessJwt}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        repo: this.did,
        collection: 'app.bsky.feed.post',
        record
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(`Bluesky API Error: ${data.message || data.error}`);
    }

    return { success: true, postId: data.uri, message };
  }

  async verifyToken() {
    try {
      await this.createSession();
      return { valid: true, name: this.handle, id: this.did };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }
}

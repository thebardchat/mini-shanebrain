/**
 * Facebook platform - Graph API wrapper
 */

import { BasePlatform } from './base.js';

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export class FacebookPlatform extends BasePlatform {
  constructor(pageId, accessToken) {
    super({ name: 'facebook', maxLength: 63206 });
    if (!pageId || !accessToken) {
      throw new Error('Missing FACEBOOK_PAGE_ID or FACEBOOK_ACCESS_TOKEN in .env');
    }
    this.pageId = pageId;
    this.accessToken = accessToken;
  }

  async post(message) {
    const url = `${GRAPH_API_BASE}/${this.pageId}/feed`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        access_token: this.accessToken
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(`Facebook API Error: ${data.error.message}`);
    }

    return { success: true, postId: data.id, message };
  }

  async getRecentPosts(limit = 5) {
    const url = `${GRAPH_API_BASE}/${this.pageId}/posts?limit=${limit}&access_token=${this.accessToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      throw new Error(`Facebook API Error: ${data.error.message}`);
    }

    return data.data || [];
  }

  async getPostEngagement(postId) {
    const url = `${GRAPH_API_BASE}/${postId}?fields=likes.summary(true),comments.summary(true),shares&access_token=${this.accessToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      throw new Error(`Facebook API Error: ${data.error.message}`);
    }

    return {
      likes: data.likes?.summary?.total_count || 0,
      comments: data.comments?.summary?.total_count || 0,
      shares: data.shares?.count || 0
    };
  }

  async verifyToken() {
    const url = `${GRAPH_API_BASE}/me?access_token=${this.accessToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      return { valid: false, error: data.error.message };
    }

    return { valid: true, name: data.name, id: data.id };
  }
}

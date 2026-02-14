/**
 * Instagram platform - Meta Graph API (two-step: container → publish)
 * Requires a public image URL for every post (Instagram has no text-only posts)
 */

import { BasePlatform } from './base.js';

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export class InstagramPlatform extends BasePlatform {
  constructor(userId, accessToken, defaultImageUrl) {
    super({ name: 'instagram', maxLength: 2200 });
    if (!userId) {
      throw new Error('Missing INSTAGRAM_USER_ID in .env');
    }
    if (!accessToken) {
      throw new Error('Missing INSTAGRAM_ACCESS_TOKEN (or FACEBOOK_ACCESS_TOKEN) in .env');
    }
    if (!defaultImageUrl) {
      throw new Error('Missing INSTAGRAM_DEFAULT_IMAGE_URL in .env — Instagram requires an image for every post');
    }
    this.userId = userId;
    this.accessToken = accessToken;
    this.defaultImageUrl = defaultImageUrl;
  }

  /**
   * Two-step Instagram publish via Meta Graph API:
   * 1. Create media container with image + caption
   * 2. Publish the container
   */
  async post(message, imageUrl) {
    const image = imageUrl || this.defaultImageUrl;

    // Step 1: Create media container
    const containerUrl = `${GRAPH_API_BASE}/${this.userId}/media`;
    const containerRes = await fetch(containerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: image,
        caption: message,
        access_token: this.accessToken
      })
    });

    const containerData = await containerRes.json();
    if (containerData.error) {
      throw new Error(`Instagram container error: ${containerData.error.message}`);
    }

    const creationId = containerData.id;

    // Step 2: Publish the container
    const publishUrl = `${GRAPH_API_BASE}/${this.userId}/media_publish`;
    const publishRes = await fetch(publishUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: creationId,
        access_token: this.accessToken
      })
    });

    const publishData = await publishRes.json();
    if (publishData.error) {
      throw new Error(`Instagram publish error: ${publishData.error.message}`);
    }

    return { success: true, postId: publishData.id, message };
  }

  async verifyToken() {
    const url = `${GRAPH_API_BASE}/${this.userId}?fields=id,username&access_token=${this.accessToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      return { valid: false, error: data.error.message };
    }

    return { valid: true, name: data.username || data.id, id: data.id };
  }
}

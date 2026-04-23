/**
 * Threads platform - Meta Threads API (two-step: container → publish)
 * Text-only posts supported. Token expires in 60 days — refresh needed.
 */

import { BasePlatform } from './base.js';

const THREADS_API_BASE = 'https://graph.threads.net/v1.0';

export class ThreadsPlatform extends BasePlatform {
  constructor(userId, accessToken) {
    super({ name: 'threads', maxLength: 500 });
    if (!userId || !accessToken) {
      throw new Error('Missing THREADS_USER_ID or THREADS_ACCESS_TOKEN in .env');
    }
    this.userId = userId;
    this.accessToken = accessToken;
  }

  /**
   * Two-step Threads publish:
   * 1. Create text container
   * 2. Publish the container (with a brief wait)
   */
  async post(message) {
    // Step 1: Create container
    const createRes = await fetch(`${THREADS_API_BASE}/${this.userId}/threads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'TEXT',
        text: message,
        access_token: this.accessToken,
      }),
    });

    const createData = await createRes.json();
    if (createData.error) {
      throw new Error(`Threads container error: ${createData.error.message}`);
    }

    // Brief wait for container processing
    await new Promise(r => setTimeout(r, 2000));

    // Step 2: Publish
    const publishRes = await fetch(`${THREADS_API_BASE}/${this.userId}/threads_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: createData.id,
        access_token: this.accessToken,
      }),
    });

    const publishData = await publishRes.json();
    if (publishData.error) {
      throw new Error(`Threads publish error: ${publishData.error.message}`);
    }

    return { success: true, postId: publishData.id, message };
  }

  async verifyToken() {
    const url = `${THREADS_API_BASE}/me?fields=id,username&access_token=${this.accessToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      return { valid: false, error: data.error.message };
    }

    return { valid: true, name: `@${data.username}`, id: data.id };
  }
}

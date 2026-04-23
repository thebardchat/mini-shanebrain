/**
 * Bluesky platform - AT Protocol
 * Free, no approval needed. Uses app password for auth.
 */

import { BasePlatform } from './base.js';
import { readFileSync } from 'fs';
import sharp from 'sharp';

const BSKY_SERVICE = 'https://bsky.social';

export class BlueskyPlatform extends BasePlatform {
  constructor(handle, appPassword) {
    super({ name: 'bluesky', maxLength: 300 });
    if (!handle || !appPassword) {
      throw new Error('Missing BSKY_HANDLE or BSKY_APP_PASSWORD in .env');
    }
    this.handle = handle;
    this.appPassword = appPassword;
    this._session = null;
    this._sessionExpiry = 0;
  }

  /**
   * Create or refresh an authenticated session.
   * Access tokens expire in ~2 hours.
   */
  async _getSession() {
    if (this._session && Date.now() < this._sessionExpiry) {
      return this._session;
    }

    const res = await fetch(`${BSKY_SERVICE}/xrpc/com.atproto.server.createSession`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: this.handle,
        password: this.appPassword,
      }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      throw new Error(`Bluesky auth error: ${data.message || data.error || res.statusText}`);
    }

    this._session = data;
    // Expire 5 minutes early to be safe
    this._sessionExpiry = Date.now() + (110 * 60 * 1000);
    return this._session;
  }

  async post(message, image) {
    if (!image) throw new Error('No image provided — every post must have a picture');

    const session = await this._getSession();

    // Get image buffer — from local file or URL
    let rawBuffer;

    if (image.type === 'local') {
      rawBuffer = readFileSync(image.value);
    } else {
      const imgRes = await fetch(image.value);
      if (!imgRes.ok) throw new Error(`Image download failed: ${imgRes.statusText}`);
      rawBuffer = Buffer.from(await imgRes.arrayBuffer());
    }

    // Bluesky limit is 976KB — compress with sharp if needed
    let imgBuffer = rawBuffer;
    let contentType = 'image/jpeg';
    const MAX_SIZE = 950 * 1024; // 950KB to be safe

    if (rawBuffer.length > MAX_SIZE) {
      console.log(`[bluesky] Compressing image: ${(rawBuffer.length / 1024).toFixed(0)}KB -> max 950KB`);
      imgBuffer = await sharp(rawBuffer)
        .resize(1200, 630, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      // If still too big, reduce quality further
      if (imgBuffer.length > MAX_SIZE) {
        imgBuffer = await sharp(rawBuffer)
          .resize(800, 420, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 60 })
          .toBuffer();
      }
      console.log(`[bluesky] Compressed to ${(imgBuffer.length / 1024).toFixed(0)}KB`);
    }

    const uploadRes = await fetch(`${BSKY_SERVICE}/xrpc/com.atproto.repo.uploadBlob`, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        'Authorization': `Bearer ${session.accessJwt}`,
      },
      body: imgBuffer,
    });

    const uploadData = await uploadRes.json();
    if (!uploadRes.ok || !uploadData.blob) {
      throw new Error(`Bluesky image upload failed: ${uploadData.message || uploadData.error || 'no blob returned'}`);
    }

    const record = {
      text: message,
      createdAt: new Date().toISOString(),
      embed: {
        $type: 'app.bsky.embed.images',
        images: [{
          alt: message.substring(0, 300),
          image: uploadData.blob,
        }],
      },
    };

    const res = await fetch(`${BSKY_SERVICE}/xrpc/com.atproto.repo.createRecord`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.accessJwt}`,
      },
      body: JSON.stringify({
        repo: session.did,
        collection: 'app.bsky.feed.post',
        record,
      }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      const msg = data.message || data.error || res.statusText;
      throw new Error(`Bluesky post error: ${msg}`);
    }

    return { success: true, postId: data.uri, message };
  }

  async verifyToken() {
    try {
      const session = await this._getSession();
      return { valid: true, name: `@${session.handle}`, id: session.did };
    } catch (e) {
      return { valid: false, error: e.message };
    }
  }
}

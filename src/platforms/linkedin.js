/**
 * LinkedIn platform - REST Posts API with Bearer token
 * Tokens expire in 60 days (manual refresh for now)
 */

import { BasePlatform } from './base.js';

const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';

export class LinkedInPlatform extends BasePlatform {
  constructor(accessToken, personUrn) {
    super({ name: 'linkedin', maxLength: 3000 });
    if (!accessToken) {
      throw new Error('Missing LINKEDIN_ACCESS_TOKEN in .env');
    }
    if (!personUrn) {
      throw new Error('Missing LINKEDIN_PERSON_URN in .env (format: urn:li:person:YOUR_ID)');
    }
    this.accessToken = accessToken;
    this.personUrn = personUrn;
  }

  async post(message) {
    const url = `${LINKEDIN_API_BASE}/posts`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202401'
      },
      body: JSON.stringify({
        author: this.personUrn,
        commentary: message,
        visibility: 'PUBLIC',
        distribution: {
          feedDistribution: 'MAIN_FEED',
          targetEntities: [],
          thirdPartyDistributionChannels: []
        },
        lifecycleState: 'PUBLISHED',
        isReshareDisabledByAuthor: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData.message || response.statusText;
      throw new Error(`LinkedIn API Error (${response.status}): ${msg}`);
    }

    // LinkedIn returns the post URN in the x-restli-id header
    const postId = response.headers.get('x-restli-id') || 'posted';

    return { success: true, postId, message };
  }

  async verifyToken() {
    const url = `${LINKEDIN_API_BASE}/me`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });

    const data = await response.json();

    if (!response.ok || data.status === 401) {
      return { valid: false, error: data.message || 'Invalid or expired token' };
    }

    const name = [data.localizedFirstName, data.localizedLastName]
      .filter(Boolean)
      .join(' ') || data.id;

    return { valid: true, name, id: data.id };
  }
}

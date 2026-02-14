/**
 * Platform registry - loads enabled platforms from .env toggles
 */

import { FacebookPlatform } from './facebook.js';
import { InstagramPlatform } from './instagram.js';
import { LinkedInPlatform } from './linkedin.js';

/**
 * Read .env toggles and return array of enabled platform instances.
 * POST_TO_FACEBOOK defaults true for backward compat.
 */
export function loadPlatforms() {
  const platforms = [];

  // Facebook (default: enabled for backward compat)
  if (process.env.POST_TO_FACEBOOK !== 'false') {
    platforms.push(
      new FacebookPlatform(
        process.env.FACEBOOK_PAGE_ID,
        process.env.FACEBOOK_ACCESS_TOKEN
      )
    );
  }

  // Instagram
  if (process.env.POST_TO_INSTAGRAM === 'true') {
    platforms.push(
      new InstagramPlatform(
        process.env.INSTAGRAM_USER_ID,
        process.env.INSTAGRAM_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN,
        process.env.INSTAGRAM_DEFAULT_IMAGE_URL
      )
    );
  }

  // LinkedIn
  if (process.env.POST_TO_LINKEDIN === 'true') {
    platforms.push(
      new LinkedInPlatform(
        process.env.LINKEDIN_ACCESS_TOKEN,
        process.env.LINKEDIN_PERSON_URN
      )
    );
  }

  return platforms;
}

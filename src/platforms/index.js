/**
 * Platform registry - loads enabled platforms from .env toggles
 */

import { FacebookPlatform } from './facebook.js';
import { InstagramPlatform } from './instagram.js';
import { LinkedInPlatform } from './linkedin.js';
import { XPlatform } from './x.js';
import { ThreadsPlatform } from './threads.js';
import { BlueskyPlatform } from './bluesky.js';

/**
 * Read .env toggles and return array of enabled platform instances.
 * Each platform has POST_TO_<NAME>=true/false in .env.
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

  // Instagram (images auto-generated via Pollinations AI)
  if (process.env.POST_TO_INSTAGRAM === 'true') {
    platforms.push(
      new InstagramPlatform(
        process.env.INSTAGRAM_USER_ID,
        process.env.INSTAGRAM_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN
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

  // X (Twitter)
  if (process.env.POST_TO_X === 'true') {
    platforms.push(
      new XPlatform(
        process.env.X_API_KEY,
        process.env.X_API_SECRET,
        process.env.X_ACCESS_TOKEN,
        process.env.X_ACCESS_TOKEN_SECRET
      )
    );
  }

  // Threads
  if (process.env.POST_TO_THREADS === 'true') {
    platforms.push(
      new ThreadsPlatform(
        process.env.THREADS_USER_ID,
        process.env.THREADS_ACCESS_TOKEN
      )
    );
  }

  // Bluesky
  if (process.env.POST_TO_BLUESKY === 'true') {
    platforms.push(
      new BlueskyPlatform(
        process.env.BSKY_HANDLE,
        process.env.BSKY_APP_PASSWORD
      )
    );
  }

  return platforms;
}

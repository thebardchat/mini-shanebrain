/**
 * Platform registry - loads enabled platforms from .env toggles
 */

import { FacebookPlatform } from './facebook.js';
import { InstagramPlatform } from './instagram.js';
import { LinkedInPlatform } from './linkedin.js';
import { TwitterPlatform } from './twitter.js';
import { RedditPlatform } from './reddit.js';
import { DiscordPlatform } from './discord.js';
import { BlueskyPlatform } from './bluesky.js';

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

  // X/Twitter
  if (process.env.POST_TO_TWITTER === 'true') {
    platforms.push(
      new TwitterPlatform(
        process.env.TWITTER_BEARER_TOKEN,
        process.env.TWITTER_API_KEY,
        process.env.TWITTER_API_SECRET,
        process.env.TWITTER_ACCESS_TOKEN,
        process.env.TWITTER_ACCESS_TOKEN_SECRET
      )
    );
  }

  // Reddit
  if (process.env.POST_TO_REDDIT === 'true') {
    platforms.push(
      new RedditPlatform(
        process.env.REDDIT_CLIENT_ID,
        process.env.REDDIT_CLIENT_SECRET,
        process.env.REDDIT_USERNAME,
        process.env.REDDIT_PASSWORD,
        process.env.REDDIT_USER_AGENT
      )
    );
  }

  // Discord
  if (process.env.POST_TO_DISCORD === 'true') {
    const discord = new DiscordPlatform(
      process.env.DISCORD_WEBHOOK_URL,
      process.env.DISCORD_BOT_NAME || 'ShaneBrain'
    );

    // Register additional channel webhooks if configured
    if (process.env.DISCORD_WEBHOOK_TRACK_DROPS) {
      discord.addChannel('track-drops', process.env.DISCORD_WEBHOOK_TRACK_DROPS);
    }
    if (process.env.DISCORD_WEBHOOK_CASE_FILE) {
      discord.addChannel('the-case-file', process.env.DISCORD_WEBHOOK_CASE_FILE);
    }

    platforms.push(discord);
  }

  // Bluesky
  if (process.env.POST_TO_BLUESKY === 'true') {
    platforms.push(
      new BlueskyPlatform(
        process.env.BLUESKY_HANDLE,
        process.env.BLUESKY_APP_PASSWORD
      )
    );
  }

  return platforms;
}

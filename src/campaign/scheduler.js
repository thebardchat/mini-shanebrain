/**
 * Campaign Scheduler
 * Enhanced scheduler that pulls from content queue and posts to all platforms
 * Supports per-platform cadence and campaign phases
 */

import cron from 'node-cron';
import { ContentQueue } from './content-queue.js';
import { appendFileSync, mkdirSync, existsSync } from 'fs';

const colors = {
  green: (t) => `\x1b[32m${t}\x1b[0m`,
  yellow: (t) => `\x1b[33m${t}\x1b[0m`,
  red: (t) => `\x1b[31m${t}\x1b[0m`,
  cyan: (t) => `\x1b[36m${t}\x1b[0m`,
  dim: (t) => `\x1b[2m${t}\x1b[0m`,
  gold: (t) => `\x1b[33;1m${t}\x1b[0m`
};

function log(msg, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = {
    info: colors.cyan('[CAMPAIGN]'),
    success: colors.green('[POSTED]'),
    warn: colors.yellow('[WARN]'),
    error: colors.red('[ERROR]'),
    campaign: colors.gold('[PROMO]')
  };
  console.log(`${colors.dim(timestamp)} ${prefix[type] || ''} ${msg}`);
}

function logToFile(platform, content, type, success, error = null) {
  const logsDir = './logs';
  if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });

  const timestamp = new Date().toISOString();
  const status = success ? 'POSTED' : 'FAILED';
  let entry = `[${timestamp}] [${platform.toUpperCase()}] [${status}] [${type}]\n${content}\n`;
  if (error) entry += `Error: ${error}\n`;
  entry += '─'.repeat(50) + '\n';

  appendFileSync(`${logsDir}/campaign.log`, entry);
}

/**
 * Platform-specific posting schedules (cron expressions)
 * Configurable via config/campaign-schedule.json
 */
const DEFAULT_SCHEDULES = {
  twitter: '0 7,10,13,16,19 * * *',    // 5x/day
  facebook: '0 9,17 * * *',             // 2x/day
  reddit: '0 11,18 * * *',              // 2x/day
  discord: '0 8,13,20 * * *',           // 3x/day
  bluesky: '0 9,15 * * *',              // 2x/day
  linkedin: '0 8 * * 1-5',              // 1x/day weekdays
  instagram: '0 12,18 * * *'            // 2x/day
};

/**
 * Start the campaign scheduler
 * @param {Array} platforms - enabled platform instances
 * @param {ContentGenerator} ai - AI content generator
 * @param {object} scheduleConfig - per-platform cron overrides
 */
export function startCampaignScheduler(platforms, ai, scheduleConfig = {}) {
  const queue = new ContentQueue();
  const stats = { posts: 0, errors: 0, byPlatform: {}, byType: {} };

  log('Campaign engine starting...', 'campaign');
  log(`Content library: ${JSON.stringify(queue.getStats())}`, 'info');

  for (const platform of platforms) {
    const schedule = scheduleConfig[platform.name] || DEFAULT_SCHEDULES[platform.name] || '0 9,17 * * *';

    if (!cron.validate(schedule)) {
      log(`Invalid schedule for ${platform.name}: ${schedule}`, 'error');
      continue;
    }

    stats.byPlatform[platform.name] = { posts: 0, errors: 0 };

    log(`[${platform.name}] Scheduled: ${schedule}`, 'info');

    cron.schedule(schedule, async () => {
      try {
        // Get next content from queue
        const contentItem = queue.getScheduledContent();
        if (!contentItem) {
          log(`[${platform.name}] No content available in queue`, 'warn');
          return;
        }

        log(`[${platform.name}] Posting ${contentItem.type}: "${contentItem.text.substring(0, 40)}..."`, 'campaign');

        // Adapt content for platform via AI
        const adaptedContent = await ai.generatePost({
          platform: platform.name,
          maxLength: platform.maxLength,
          content: contentItem.text
        });

        // Post to platform
        const result = await platform.post(adaptedContent);

        // Track success
        stats.posts++;
        stats.byPlatform[platform.name].posts++;
        stats.byType[contentItem.type] = (stats.byType[contentItem.type] || 0) + 1;
        queue.markPosted(contentItem.type, contentItem.id);

        log(`[${platform.name}] ${colors.green('Posted!')} ID: ${result.postId}`, 'success');
        logToFile(platform.name, adaptedContent, contentItem.type, true);

      } catch (err) {
        stats.errors++;
        stats.byPlatform[platform.name].errors++;

        log(`[${platform.name}] Failed: ${err.message}`, 'error');
        logToFile(platform.name, 'Failed', 'unknown', false, err.message);
      }
    });
  }

  // Stats report every 6 hours
  cron.schedule('0 */6 * * *', () => {
    log('─── Campaign Stats ───', 'campaign');
    log(`Total: ${stats.posts} posts, ${stats.errors} errors`, 'info');
    for (const [name, s] of Object.entries(stats.byPlatform)) {
      log(`  ${name}: ${s.posts} posts, ${s.errors} errors`, 'info');
    }
    for (const [type, count] of Object.entries(stats.byType)) {
      log(`  ${type}: ${count} posts`, 'info');
    }
    log(`Queue: ${JSON.stringify(queue.getStats())}`, 'info');
    log('──────────────────────', 'campaign');
  });

  process.on('SIGINT', () => {
    log(`\nCampaign shutting down. ${stats.posts} posts, ${stats.errors} errors.`, 'warn');
    process.exit(0);
  });

  log('Campaign engine running. Press Ctrl+C to stop.', 'campaign');
}

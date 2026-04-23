/**
 * Scheduler for automated multi-platform posting
 * Supports per-platform cron schedules via SCHEDULE_<PLATFORM> env vars
 */

import cron from 'node-cron';
import { appendFileSync, mkdirSync, existsSync } from 'fs';

const colors = {
  green: (t) => `\x1b[32m${t}\x1b[0m`,
  yellow: (t) => `\x1b[33m${t}\x1b[0m`,
  red: (t) => `\x1b[31m${t}\x1b[0m`,
  cyan: (t) => `\x1b[36m${t}\x1b[0m`,
  dim: (t) => `\x1b[2m${t}\x1b[0m`
};

function log(msg, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = {
    info: colors.cyan('[INFO]'),
    success: colors.green('[OK]'),
    warn: colors.yellow('[WARN]'),
    error: colors.red('[ERROR]')
  };
  console.log(`${colors.dim(timestamp)} ${prefix[type] || ''} ${msg}`);
}

function logToFile(platform, content, success, error = null) {
  const logsDir = './logs';
  if (!existsSync(logsDir)) {
    mkdirSync(logsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString();
  const status = success ? 'POSTED' : 'FAILED';
  let entry = `[${timestamp}] [${platform.toUpperCase()}] [${status}]\n${content}\n`;
  if (error) {
    entry += `Error: ${error}\n`;
  }
  entry += '─'.repeat(50) + '\n';

  appendFileSync(`${logsDir}/posts.log`, entry);
}

/**
 * Default schedules per platform (can be overridden by SCHEDULE_<NAME> env vars)
 */
const DEFAULT_SCHEDULES = {
  facebook:  '0 8,17 * * *',         // 2x/day: 8am, 5pm
  instagram: '0 12 * * *',           // 1x/day: noon
  linkedin:  '0 9 * * 1,3,5',        // 3x/week: Mon/Wed/Fri 9am
  x:         '0 7,12,18 * * *',      // 3x/day: 7am, noon, 6pm
  threads:   '0 10,16 * * *',        // 2x/day: 10am, 4pm
  bluesky:   '0 14 * * *',           // 1x/day: 2pm
};

/**
 * Post to a single platform with AI generation + signature
 */
async function postToPlatform(platform, ai, stats) {
  try {
    // generateAllPosts handles signoff + image internally
    const posts = await ai.generateAllPosts([platform]);
    const post = posts[platform.name];
    if (!post) {
      log(`[${platform.name}] No content generated`, 'error');
      stats.errors++;
      return;
    }
    const { text: content, image } = post;
    log(`[${platform.name}] Generated: "${content.substring(0, 60)}..."`);

    const result = await platform.post(content, image);
    stats.posted++;

    log(`[${platform.name}] Posted! ID: ${result.postId}`, 'success');
    logToFile(platform.name, content, true);
  } catch (err) {
    stats.errors++;
    log(`[${platform.name}] Failed: ${err.message}`, 'error');
    logToFile(platform.name, 'Failed to generate/post', false, err.message);
  }
}

/**
 * Start per-platform cron schedulers.
 * Each platform gets its own schedule from SCHEDULE_<NAME> or a default.
 */
export function startScheduler(platforms, ai, globalSchedule) {
  const stats = { posted: 0, errors: 0 };

  for (const platform of platforms) {
    // Check for per-platform schedule, then global, then default
    const envKey = `SCHEDULE_${platform.name.toUpperCase()}`;
    const schedule = process.env[envKey] || globalSchedule || DEFAULT_SCHEDULES[platform.name] || '0 12 * * *';

    if (!cron.validate(schedule)) {
      log(`[${platform.name}] Invalid cron: ${schedule} — skipping`, 'error');
      continue;
    }

    log(`[${platform.name}] Scheduled: ${schedule}`);

    cron.schedule(schedule, async () => {
      log(`[${platform.name}] Triggered...`);
      await postToPlatform(platform, ai, stats);
      log(`Stats: ${stats.posted} posted, ${stats.errors} errors`);
    });
  }

  log(`Scheduler running for ${platforms.length} platform(s). Press Ctrl+C to stop.`, 'warn');

  process.on('SIGINT', () => {
    log(`\nShutting down. Final: ${stats.posted} posted, ${stats.errors} errors`, 'warn');
    process.exit(0);
  });
}

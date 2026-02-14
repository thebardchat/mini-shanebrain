/**
 * Scheduler for automated multi-platform posting
 * Uses node-cron for timing
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
 * @param {Array} platforms - array of BasePlatform instances
 * @param {ContentGenerator} ai - AI content generator
 * @param {string} cronSchedule - cron expression
 */
export function startScheduler(platforms, ai, cronSchedule) {
  if (!cron.validate(cronSchedule)) {
    log(`Invalid cron schedule: ${cronSchedule}`, 'error');
    process.exit(1);
  }

  const names = platforms.map(p => p.name).join(', ');
  log(`Scheduler started for: ${names}`);
  log(`Next posts at: ${getNextRuns(cronSchedule, 3).join(', ')}`);

  let postCount = 0;
  let errorCount = 0;

  cron.schedule(cronSchedule, async () => {
    log('Scheduled post triggered...');

    for (const platform of platforms) {
      try {
        const content = await ai.generatePost({
          platform: platform.name,
          maxLength: platform.maxLength
        });
        log(`[${platform.name}] Generated: "${content.substring(0, 50)}..."`);

        const result = await platform.post(content);
        postCount++;

        log(`[${platform.name}] Posted! ID: ${result.postId}`, 'success');
        logToFile(platform.name, content, true);

      } catch (err) {
        errorCount++;
        log(`[${platform.name}] Failed: ${err.message}`, 'error');
        logToFile(platform.name, 'Failed to generate/post', false, err.message);
      }
    }

    log(`Stats: ${postCount} posts, ${errorCount} errors`);

    if (errorCount >= 5) {
      log('Too many errors. Check your tokens and API status.', 'error');
    }
  });

  process.on('SIGINT', () => {
    log(`\nShutting down. Final stats: ${postCount} posts, ${errorCount} errors`, 'warn');
    process.exit(0);
  });
}

function getNextRuns(cronExpr, count) {
  const parts = cronExpr.split(' ');
  if (parts.length >= 5) {
    const hours = parts[1].split(',');
    return hours.slice(0, count).map(h => `${h}:00`);
  }
  return ['(see cron schedule)'];
}

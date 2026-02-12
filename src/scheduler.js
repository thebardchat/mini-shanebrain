/**
 * Scheduler for automated posting
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

function logToFile(content, success, error = null) {
  const logsDir = './logs';
  if (!existsSync(logsDir)) {
    mkdirSync(logsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString();
  const status = success ? 'POSTED' : 'FAILED';
  let entry = `[${timestamp}] [${status}]\n${content}\n`;
  if (error) {
    entry += `Error: ${error}\n`;
  }
  entry += '─'.repeat(50) + '\n';

  appendFileSync(`${logsDir}/posts.log`, entry);
}

export function startScheduler(fb, ai, cronSchedule) {
  // Validate cron expression
  if (!cron.validate(cronSchedule)) {
    log(`Invalid cron schedule: ${cronSchedule}`, 'error');
    process.exit(1);
  }

  log(`Scheduler started. Next posts at: ${getNextRuns(cronSchedule, 3).join(', ')}`);

  let postCount = 0;
  let errorCount = 0;

  cron.schedule(cronSchedule, async () => {
    log('Scheduled post triggered...');

    try {
      // Generate content
      const content = await ai.generatePost();
      log(`Generated: "${content.substring(0, 50)}..."`);

      // Post to Facebook
      const result = await fb.post(content);
      postCount++;

      log(`Posted successfully! ID: ${result.postId}`, 'success');
      log(`Stats: ${postCount} posts, ${errorCount} errors`);
      logToFile(content, true);

    } catch (err) {
      errorCount++;
      log(`Failed to post: ${err.message}`, 'error');
      logToFile('Failed to generate/post', false, err.message);

      // If too many errors, maybe pause
      if (errorCount >= 5) {
        log('Too many consecutive errors. Check your tokens and API status.', 'error');
      }
    }
  });

  // Keep the process alive
  process.on('SIGINT', () => {
    log(`\nShutting down. Final stats: ${postCount} posts, ${errorCount} errors`, 'warn');
    process.exit(0);
  });
}

function getNextRuns(cronExpr, count) {
  // Simple approximation - just show the schedule pattern
  const parts = cronExpr.split(' ');
  if (parts.length >= 5) {
    const hours = parts[1].split(',');
    return hours.slice(0, count).map(h => `${h}:00`);
  }
  return ['(see cron schedule)'];
}

#!/usr/bin/env node
/**
 * mini-shanebrain CLI
 * Multi-platform social media automation for the ADHD brain
 */

import 'dotenv/config';
import { loadPlatforms } from './platforms/index.js';
import { ContentGenerator } from './ai.js';
import { startScheduler } from './scheduler.js';
import { appendFileSync, mkdirSync, existsSync } from 'fs';

// Parse command line args
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isPost = args.includes('--post');
const isSchedule = args.includes('--schedule');
const isVerify = args.includes('--verify');
const isIdeas = args.includes('--ideas');
const isPlatforms = args.includes('--platforms');

// Colors for terminal output
const colors = {
  green: (t) => `\x1b[32m${t}\x1b[0m`,
  yellow: (t) => `\x1b[33m${t}\x1b[0m`,
  red: (t) => `\x1b[31m${t}\x1b[0m`,
  cyan: (t) => `\x1b[36m${t}\x1b[0m`,
  dim: (t) => `\x1b[2m${t}\x1b[0m`
};

function log(msg, type = 'info') {
  const prefix = {
    info: colors.cyan('[INFO]'),
    success: colors.green('[OK]'),
    warn: colors.yellow('[WARN]'),
    error: colors.red('[ERROR]')
  };
  console.log(`${prefix[type] || ''} ${msg}`);
}

function logToFile(platform, content, posted = false) {
  const logsDir = './logs';
  if (!existsSync(logsDir)) {
    mkdirSync(logsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString();
  const status = posted ? 'POSTED' : 'DRY-RUN';
  const entry = `[${timestamp}] [${platform.toUpperCase()}] [${status}]\n${content}\n${'─'.repeat(50)}\n`;

  appendFileSync(`${logsDir}/posts.log`, entry);
}

async function main() {
  console.log(`\n${colors.cyan('╔══════════════════════════════════════╗')}`);
  console.log(`${colors.cyan('║')}     ${colors.green('mini-shanebrain')} v2.0.0          ${colors.cyan('║')}`);
  console.log(`${colors.cyan('║')}  ${colors.dim('Multi-platform social bot')}          ${colors.cyan('║')}`);
  console.log(`${colors.cyan('╚══════════════════════════════════════╝')}\n`);

  // Show help if no args
  if (!isDryRun && !isPost && !isSchedule && !isVerify && !isIdeas && !isPlatforms) {
    console.log('Usage:');
    console.log('  npm run dry-run     Preview posts without publishing');
    console.log('  npm run post        Generate and publish to all platforms');
    console.log('  npm run schedule    Run continuously on schedule');
    console.log('');
    console.log('Other commands:');
    console.log('  node src/index.js --platforms  Show enabled platforms');
    console.log('  node src/index.js --verify     Check all platform tokens');
    console.log('  node src/index.js --ideas      Generate post ideas');
    console.log('');
    return;
  }

  // Load enabled platforms
  const platforms = loadPlatforms();

  if (platforms.length === 0) {
    log('No platforms enabled! Check POST_TO_* settings in .env', 'error');
    process.exit(1);
  }

  // Show platforms
  if (isPlatforms) {
    console.log(colors.green('Enabled platforms:'));
    for (const p of platforms) {
      console.log(`  - ${p.name} (max ${p.maxLength} chars)`);
    }
    console.log(`\nTotal: ${platforms.length} platform(s)`);
    return;
  }

  // Initialize AI
  const ai = new ContentGenerator({
    useOllama: process.env.USE_OLLAMA,
    ollamaUrl: process.env.OLLAMA_URL,
    ollamaModel: process.env.OLLAMA_MODEL,
    anthropicKey: process.env.ANTHROPIC_API_KEY,
    personality: process.env.PAGE_PERSONALITY
  });

  // Verify tokens
  if (isVerify) {
    for (const platform of platforms) {
      log(`Verifying ${platform.name} token...`);
      const result = await platform.verifyToken();
      if (result.valid) {
        log(`[${platform.name}] Token valid! Connected as: ${result.name}`, 'success');
      } else {
        log(`[${platform.name}] Token invalid: ${result.error}`, 'error');
      }
    }
    return;
  }

  // Generate ideas
  if (isIdeas) {
    log('Generating post ideas...');
    const ideas = await ai.generateIdeas(5);
    console.log('\n' + colors.green('Post Ideas:'));
    console.log(ideas);
    console.log('');
    return;
  }

  // Schedule mode
  if (isSchedule) {
    const schedule = process.env.POST_SCHEDULE || '0 9,14,19 * * *';
    const names = platforms.map(p => p.name).join(', ');
    log(`Starting scheduler for: ${names}`);
    log(`Cron: ${schedule}`);
    log('Bot will run continuously. Press Ctrl+C to stop.', 'warn');
    startScheduler(platforms, ai, schedule);
    return;
  }

  // Single post mode (dry-run or live) — loop over all platforms
  for (const platform of platforms) {
    log(`[${platform.name}] Generating content...`);
    const content = await ai.generatePost({
      platform: platform.name,
      maxLength: platform.maxLength
    });

    console.log(`\n${colors.green(`[${platform.name}] Generated post:`)}`);
    console.log('─'.repeat(50));
    console.log(content);
    console.log('─'.repeat(50));
    console.log(`Characters: ${content.length}`);
    console.log('');

    if (isDryRun) {
      log(`[${platform.name}] DRY RUN - Post was NOT published`, 'warn');
      logToFile(platform.name, content, false);
    }

    if (isPost) {
      log(`[${platform.name}] Publishing...`);
      try {
        const result = await platform.post(content);
        log(`[${platform.name}] Post published! ID: ${result.postId}`, 'success');
        logToFile(platform.name, content, true);
      } catch (err) {
        log(`[${platform.name}] Failed: ${err.message}`, 'error');
        logToFile(platform.name, content, false);
      }
    }
  }
}

main().catch((err) => {
  log(err.message, 'error');
  process.exit(1);
});

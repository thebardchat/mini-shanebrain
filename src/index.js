#!/usr/bin/env node
/**
 * mini-shanebrain CLI
 * Quick-win Facebook automation for the ADHD brain
 */

import 'dotenv/config';
import { FacebookAPI } from './facebook.js';
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

function logToFile(content, posted = false) {
  const logsDir = './logs';
  if (!existsSync(logsDir)) {
    mkdirSync(logsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString();
  const status = posted ? 'POSTED' : 'DRY-RUN';
  const entry = `[${timestamp}] [${status}]\n${content}\n${'─'.repeat(50)}\n`;

  appendFileSync(`${logsDir}/posts.log`, entry);
}

async function main() {
  console.log(`\n${colors.cyan('╔══════════════════════════════════════╗')}`);
  console.log(`${colors.cyan('║')}     ${colors.green('mini-shanebrain')} v1.0.0          ${colors.cyan('║')}`);
  console.log(`${colors.cyan('║')}  ${colors.dim('ADHD-friendly Facebook bot')}         ${colors.cyan('║')}`);
  console.log(`${colors.cyan('╚══════════════════════════════════════╝')}\n`);

  // Show help if no args
  if (!isDryRun && !isPost && !isSchedule && !isVerify && !isIdeas) {
    console.log('Usage:');
    console.log('  npm run dry-run     Preview a post without publishing');
    console.log('  npm run post        Generate and publish one post');
    console.log('  npm run schedule    Run continuously on schedule');
    console.log('');
    console.log('Other commands:');
    console.log('  node src/index.js --verify    Check if your tokens work');
    console.log('  node src/index.js --ideas     Generate post ideas');
    console.log('');
    return;
  }

  // Initialize services
  const fb = new FacebookAPI(
    process.env.FACEBOOK_PAGE_ID,
    process.env.FACEBOOK_ACCESS_TOKEN
  );

  const ai = new ContentGenerator({
    useOllama: process.env.USE_OLLAMA,
    ollamaUrl: process.env.OLLAMA_URL,
    ollamaModel: process.env.OLLAMA_MODEL,
    anthropicKey: process.env.ANTHROPIC_API_KEY,
    personality: process.env.PAGE_PERSONALITY
  });

  // Verify token
  if (isVerify) {
    log('Verifying Facebook token...');
    const result = await fb.verifyToken();
    if (result.valid) {
      log(`Token valid! Connected as: ${result.name}`, 'success');
    } else {
      log(`Token invalid: ${result.error}`, 'error');
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
    log(`Starting scheduler with cron: ${schedule}`);
    log('Bot will run continuously. Press Ctrl+C to stop.', 'warn');
    startScheduler(fb, ai, schedule);
    return;
  }

  // Single post mode (dry-run or live)
  log('Generating content...');
  const content = await ai.generatePost();

  console.log('\n' + colors.green('Generated post:'));
  console.log('─'.repeat(50));
  console.log(content);
  console.log('─'.repeat(50));
  console.log(`Characters: ${content.length}`);
  console.log('');

  if (isDryRun) {
    log('DRY RUN - Post was NOT published', 'warn');
    logToFile(content, false);
    return;
  }

  if (isPost) {
    log('Publishing to Facebook...');
    const result = await fb.post(content);
    log(`Post published! ID: ${result.postId}`, 'success');
    logToFile(content, true);
  }
}

main().catch((err) => {
  log(err.message, 'error');
  process.exit(1);
});

#!/usr/bin/env node
/**
 * mini-shanebrain CLI
 * Multi-platform social media automation & campaign engine
 */

import 'dotenv/config';
import { loadPlatforms } from './platforms/index.js';
import { ContentGenerator } from './ai.js';
import { startScheduler } from './scheduler.js';
import { startCampaignScheduler } from './campaign/scheduler.js';
import { ContentQueue } from './campaign/content-queue.js';
import { CampaignAnalytics } from './campaign/analytics.js';
import { appendFileSync, mkdirSync, existsSync, readFileSync } from 'fs';

// Parse command line args
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isPost = args.includes('--post');
const isSchedule = args.includes('--schedule');
const isVerify = args.includes('--verify');
const isIdeas = args.includes('--ideas');
const isPlatforms = args.includes('--platforms');
const isCampaign = args.includes('--campaign');
const isStats = args.includes('--stats');
const isPreview = args.includes('--preview');

// Colors for terminal output
const colors = {
  green: (t) => `\x1b[32m${t}\x1b[0m`,
  yellow: (t) => `\x1b[33m${t}\x1b[0m`,
  red: (t) => `\x1b[31m${t}\x1b[0m`,
  cyan: (t) => `\x1b[36m${t}\x1b[0m`,
  dim: (t) => `\x1b[2m${t}\x1b[0m`,
  gold: (t) => `\x1b[33;1m${t}\x1b[0m`
};

function log(msg, type = 'info') {
  const prefix = {
    info: colors.cyan('[INFO]'),
    success: colors.green('[OK]'),
    warn: colors.yellow('[WARN]'),
    error: colors.red('[ERROR]'),
    campaign: colors.gold('[PROMO]')
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
  console.log(`\n${colors.cyan('╔══════════════════════════════════════════╗')}`);
  console.log(`${colors.cyan('║')}     ${colors.green('mini-shanebrain')} v3.0.0              ${colors.cyan('║')}`);
  console.log(`${colors.cyan('║')}  ${colors.dim('Multi-platform campaign engine')}          ${colors.cyan('║')}`);
  console.log(`${colors.cyan('╚══════════════════════════════════════════╝')}\n`);

  // Show help if no args
  if (!isDryRun && !isPost && !isSchedule && !isVerify && !isIdeas && !isPlatforms && !isCampaign && !isStats && !isPreview) {
    console.log('Usage:');
    console.log('  npm run dry-run      Preview posts without publishing');
    console.log('  npm run post         Generate and publish to all platforms');
    console.log('  npm run schedule     Run continuously on schedule');
    console.log('  npm run campaign     Run campaign engine (content queue + multi-platform)');
    console.log('');
    console.log('Campaign commands:');
    console.log('  node src/index.js --preview   Preview next campaign content');
    console.log('  node src/index.js --stats     Show campaign analytics');
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

  // Campaign stats
  if (isStats) {
    const analytics = new CampaignAnalytics();
    const summary = analytics.getSummary();
    const today = analytics.getToday();

    console.log(colors.gold('═══ Campaign Analytics ═══'));
    console.log(`Total posts: ${summary.totalPosts}`);
    console.log(`Active platforms: ${summary.activePlatforms}`);
    console.log(`Active days: ${summary.activeDays}`);
    console.log(`Avg posts/day: ${summary.avgPostsPerDay}`);
    console.log('');
    console.log(colors.cyan('Today:'));
    console.log(`  Posts: ${today.total}`);
    for (const [p, c] of Object.entries(today.byPlatform || {})) {
      console.log(`  ${p}: ${c}`);
    }
    console.log('');
    console.log(colors.cyan('Platform totals:'));
    for (const [p, s] of Object.entries(summary.platforms)) {
      console.log(`  ${p}: ${s.total} posts (last: ${s.lastPost})`);
    }
    return;
  }

  // Campaign preview — show next content items
  if (isPreview) {
    const queue = new ContentQueue();
    const stats = queue.getStats();

    console.log(colors.gold('═══ Campaign Content Preview ═══'));
    console.log(`Content library: ${JSON.stringify(stats)}\n`);

    for (const type of ['excerpts', 'behindScenes', 'teasers', 'engagement', 'ecosystem']) {
      const item = queue.getNext(type);
      if (item) {
        console.log(colors.cyan(`[${type}] Next up:`));
        console.log(`  ID: ${item.id}`);
        console.log(`  ${item.text.substring(0, 100)}...`);
        console.log('');
      }
    }
    return;
  }

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

  // Campaign mode — content queue + multi-platform scheduling
  if (isCampaign) {
    let scheduleConfig = {};
    try {
      const configPath = './config/campaign-schedule.json';
      if (existsSync(configPath)) {
        const config = JSON.parse(readFileSync(configPath, 'utf8'));
        scheduleConfig = config.schedules || {};
      }
    } catch {
      log('No campaign schedule config found, using defaults', 'warn');
    }

    const names = platforms.map(p => p.name).join(', ');
    log(`Starting campaign engine for: ${names}`, 'campaign');
    log('Campaign will run continuously. Press Ctrl+C to stop.', 'warn');
    startCampaignScheduler(platforms, ai, scheduleConfig);
    return;
  }

  // Schedule mode (original simple scheduler)
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

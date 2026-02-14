#!/usr/bin/env node
/**
 * Facebook Token Exchange Script
 *
 * Exchanges a short-lived user token for a PERMANENT page access token.
 *
 * Flow:
 *   1. Short-lived User Token (~1 hour)
 *   2. → Long-lived User Token (~60 days)
 *   3. → Page Access Token (NEVER expires)
 *
 * Usage:
 *   node src/token-setup.js YOUR_SHORT_LIVED_TOKEN
 *
 * Get your short-lived token from:
 *   https://developers.facebook.com/tools/explorer/
 *   - Select your app
 *   - Add permission: pages_manage_posts, pages_read_engagement
 *   - Click "Generate Access Token"
 *   - Copy the token and pass it to this script
 */

import 'dotenv/config';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(__dirname, '..', '.env');

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

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

/**
 * Step 1: Exchange short-lived token for long-lived user token
 */
async function getLongLivedUserToken(shortToken, appId, appSecret) {
  const url = `${GRAPH_API_BASE}/oauth/access_token?` +
    `grant_type=fb_exchange_token&` +
    `client_id=${appId}&` +
    `client_secret=${appSecret}&` +
    `fb_exchange_token=${shortToken}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.error) {
    throw new Error(`Token exchange failed: ${data.error.message}`);
  }

  return {
    token: data.access_token,
    expiresIn: data.expires_in
  };
}

/**
 * Step 2: Get permanent page access token using long-lived user token
 */
async function getPageAccessToken(longLivedUserToken, pageId) {
  const url = `${GRAPH_API_BASE}/me/accounts?access_token=${longLivedUserToken}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.error) {
    throw new Error(`Page token request failed: ${data.error.message}`);
  }

  const page = data.data?.find(p => p.id === pageId);
  if (!page) {
    const available = data.data?.map(p => `${p.name} (${p.id})`).join('\n  ') || 'none';
    throw new Error(
      `Page ID ${pageId} not found. Available pages:\n  ${available}\n` +
      `Update FACEBOOK_PAGE_ID in .env if needed.`
    );
  }

  return {
    token: page.access_token,
    name: page.name,
    id: page.id
  };
}

/**
 * Verify a token and check if it expires
 */
async function debugToken(token, appId, appSecret) {
  const url = `${GRAPH_API_BASE}/debug_token?` +
    `input_token=${token}&` +
    `access_token=${appId}|${appSecret}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.error) {
    return { valid: false, error: data.error.message };
  }

  const info = data.data;
  return {
    valid: info.is_valid,
    expires: info.expires_at === 0 ? 'NEVER' : new Date(info.expires_at * 1000).toISOString(),
    scopes: info.scopes,
    type: info.type
  };
}

/**
 * Update .env file with new token
 */
function updateEnvToken(newToken) {
  let env = readFileSync(ENV_PATH, 'utf-8');

  if (env.includes('FACEBOOK_ACCESS_TOKEN=')) {
    env = env.replace(
      /FACEBOOK_ACCESS_TOKEN=.*/,
      `FACEBOOK_ACCESS_TOKEN=${newToken}`
    );
  } else {
    env += `\nFACEBOOK_ACCESS_TOKEN=${newToken}\n`;
  }

  writeFileSync(ENV_PATH, env);
}

async function main() {
  console.log(`\n${colors.cyan('╔══════════════════════════════════════╗')}`);
  console.log(`${colors.cyan('║')}  ${colors.green('Facebook Token Setup')}                ${colors.cyan('║')}`);
  console.log(`${colors.cyan('║')}  ${colors.dim('Get a permanent page token')}          ${colors.cyan('║')}`);
  console.log(`${colors.cyan('╚══════════════════════════════════════╝')}\n`);

  const shortToken = process.argv[2];
  const appId = process.env.FB_APP_ID;
  const appSecret = process.env.FB_APP_SECRET;
  const pageId = process.env.FACEBOOK_PAGE_ID;

  if (!shortToken) {
    console.log('Usage: node src/token-setup.js YOUR_SHORT_LIVED_TOKEN\n');
    console.log('Steps:');
    console.log('  1. Go to https://developers.facebook.com/tools/explorer/');
    console.log('  2. Select your app from the dropdown');
    console.log('  3. Click "Add a Permission" → pages_manage_posts, pages_read_engagement');
    console.log('  4. Click "Generate Access Token" and authorize');
    console.log('  5. Copy the token and run:\n');
    console.log(`     node src/token-setup.js PASTE_TOKEN_HERE\n`);
    return;
  }

  if (!appId || !appSecret) {
    log('Missing FB_APP_ID or FB_APP_SECRET in .env', 'error');
    return;
  }

  if (!pageId) {
    log('Missing FACEBOOK_PAGE_ID in .env', 'error');
    return;
  }

  // Step 1: Exchange for long-lived user token
  log('Step 1/3: Exchanging for long-lived user token...');
  const longLived = await getLongLivedUserToken(shortToken, appId, appSecret);
  log(`Long-lived user token obtained (expires in ${Math.round(longLived.expiresIn / 86400)} days)`, 'success');

  // Step 2: Get permanent page token
  log('Step 2/3: Getting permanent page access token...');
  const page = await getPageAccessToken(longLived.token, pageId);
  log(`Page token obtained for: ${page.name}`, 'success');

  // Step 3: Verify it's permanent
  log('Step 3/3: Verifying token is permanent...');
  const debug = await debugToken(page.token, appId, appSecret);

  if (debug.valid) {
    log(`Token valid! Expires: ${debug.expires}`, 'success');
    log(`Scopes: ${debug.scopes?.join(', ')}`, 'info');
  } else {
    log(`Token verification issue: ${debug.error}`, 'warn');
    log('Token was still saved — it may work fine.', 'warn');
  }

  // Save to .env
  updateEnvToken(page.token);
  log(`Token saved to .env`, 'success');

  console.log(`\n${colors.green('Done!')} Your page token ${debug.expires === 'NEVER' ? 'NEVER expires' : 'is set'}.`);
  console.log(`Test it: ${colors.cyan('node src/index.js --verify')}\n`);
}

main().catch((err) => {
  log(err.message, 'error');
  process.exit(1);
});

/**
 * Image system for social media posts
 * 1. Local branded images (./images/) — instant, no API dependency
 * 2. Pollinations AI fallback — generates from post content
 * 3. Picsum fallback — random curated photography
 * IMAGES ARE MANDATORY — no post goes out without one
 */

import { readdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const IMAGES_DIR = resolve(new URL('.', import.meta.url).pathname, '../images');

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Pick a random local branded image path.
 * Returns null if no images exist locally.
 */
function pickLocalImage() {
  try {
    if (!existsSync(IMAGES_DIR)) return null;
    const files = readdirSync(IMAGES_DIR).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));
    if (files.length === 0) return null;
    const pick = files[Math.floor(Math.random() * files.length)];
    return join(IMAGES_DIR, pick);
  } catch {
    return null;
  }
}

/**
 * Generate a Pollinations AI image URL from post text.
 */
export function generatePollinationsUrl(postText) {
  const cleanText = postText
    .replace(/— Shane \/\/ ShaneBrain 🧠/g, '')
    .replace(/[#@]/g, '')
    .trim()
    .substring(0, 80);

  const prompt = `Inspirational minimalist design, dark moody background with warm golden accent lighting, clean modern aesthetic, subtle brain neural network glow, motivational quote art: ${cleanText}`;
  const encoded = encodeURIComponent(prompt);
  const seed = hashCode(cleanText);
  return `https://image.pollinations.ai/prompt/${encoded}?width=1200&height=630&nologo=true&seed=${seed}`;
}

/**
 * Generate a Picsum fallback URL.
 */
function generatePicsumUrl(postText) {
  const seed = hashCode(postText);
  return `https://picsum.photos/seed/${seed}/1200/630`;
}

/**
 * Verify a URL returns an image within timeout.
 */
async function verifyImageUrl(url, timeoutMs = 30000) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    const contentType = res.headers.get('content-type') || '';
    const ok = res.ok && contentType.startsWith('image/');
    await res.arrayBuffer().catch(() => {});
    return ok;
  } catch {
    return false;
  }
}

/**
 * Get a verified image for a post. Priority:
 * 1. Local branded image (instant, no network)
 * 2. Pollinations AI (generated from content)
 * 3. Picsum (random curated photo)
 *
 * Returns { type: 'local'|'url', value: path_or_url }
 * @param {string} postText
 * @returns {Promise<{type: string, value: string}>}
 */
export async function getVerifiedImage(postText) {
  // 1. Try local branded images first
  const localPath = pickLocalImage();
  if (localPath) {
    console.log(`[IMAGE] Using local: ${localPath.split('/').pop()}`);
    return { type: 'local', value: localPath };
  }

  // 2. Try Pollinations
  const pollinationsUrl = generatePollinationsUrl(postText);
  console.log('[IMAGE] No local images, trying Pollinations...');
  if (await verifyImageUrl(pollinationsUrl, 30000)) {
    console.log('[IMAGE] Pollinations OK');
    return { type: 'url', value: pollinationsUrl };
  }

  // 3. Picsum fallback
  console.log('[IMAGE] Pollinations failed, trying Picsum...');
  const picsumUrl = generatePicsumUrl(postText);
  if (await verifyImageUrl(picsumUrl, 15000)) {
    console.log('[IMAGE] Picsum OK');
    return { type: 'url', value: picsumUrl };
  }

  throw new Error('All image sources failed — post blocked');
}

/**
 * Download an image to a Buffer.
 */
export async function downloadImage(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  const res = await fetch(url, { signal: controller.signal, redirect: 'follow' });
  clearTimeout(timeout);
  if (!res.ok) throw new Error(`Image download failed: ${res.statusText}`);
  return Buffer.from(await res.arrayBuffer());
}

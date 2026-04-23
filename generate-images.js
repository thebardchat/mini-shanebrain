#!/usr/bin/env node
/**
 * Generate 30 branded ShaneBrain images via Pollinations AI
 * Downloads to ./images/ for local use — no external dependency at post time
 */

import { writeFileSync, existsSync } from 'fs';

const BRAND_STYLE = 'dark moody background, warm golden and cyan accent lighting, neural network subtle glow, minimalist inspirational design, professional social media branded image, no text overlay';

const PROMPTS = [
  // ShaneBrain Core (1-5)
  { name: '01-shanebrain-core', prompt: `Glowing brain made of neural network connections on dark background, ${BRAND_STYLE}` },
  { name: '02-shanebrain-pi', prompt: `Raspberry Pi computer glowing with cyan light on a desk at night, circuit board details, ${BRAND_STYLE}` },
  { name: '03-shanebrain-data', prompt: `Digital data streams flowing through a brain silhouette, blue and gold particles, ${BRAND_STYLE}` },
  { name: '04-shanebrain-local', prompt: `Small server rack glowing in a home office, warm lighting, local-first infrastructure, ${BRAND_STYLE}` },
  { name: '05-shanebrain-code', prompt: `Lines of code reflected in window at night, developer workspace, warm desk lamp, ${BRAND_STYLE}` },

  // Faith (6-9)
  { name: '06-faith-light', prompt: `Golden light breaking through dark storm clouds, rays of hope, spiritual atmosphere, ${BRAND_STYLE}` },
  { name: '07-faith-cross', prompt: `Simple wooden cross silhouette against golden sunrise, rural landscape, peaceful, ${BRAND_STYLE}` },
  { name: '08-faith-hands', prompt: `Hands reaching upward toward warm golden light from above, dark surroundings, ${BRAND_STYLE}` },
  { name: '09-faith-storm', prompt: `Lighthouse beacon cutting through a dark stormy night, resilience and faith, ${BRAND_STYLE}` },

  // Family & Legacy (10-14)
  { name: '10-family-legacy', prompt: `Old oak tree with deep roots and wide branches, golden sunset, legacy and growth, ${BRAND_STYLE}` },
  { name: '11-family-home', prompt: `Warm glowing windows of a house at twilight, southern home, family warmth, ${BRAND_STYLE}` },
  { name: '12-family-generations', prompt: `Chain links made of golden light, unbreakable bond, dark background, legacy, ${BRAND_STYLE}` },
  { name: '13-family-wrestle', prompt: `Wrestling mat under spotlight, determination and grit, sports motivation, ${BRAND_STYLE}` },
  { name: '14-family-future', prompt: `Pathway of light stretching into the future, footsteps, building tomorrow, ${BRAND_STYLE}` },

  // ADHD & Momentum (15-18)
  { name: '15-adhd-hyperfocus', prompt: `Single bright laser beam cutting through chaotic light particles, hyperfocus power, ${BRAND_STYLE}` },
  { name: '16-adhd-momentum', prompt: `Rocket exhaust trail of golden sparks moving forward, momentum and speed, ${BRAND_STYLE}` },
  { name: '17-adhd-tabs', prompt: `Multiple glowing screens and windows overlapping in dark space, organized chaos, ${BRAND_STYLE}` },
  { name: '18-adhd-superpower', prompt: `Lightning bolt made of neural connections, electric energy, superpower, ${BRAND_STYLE}` },

  // Blue Collar & Dispatch (19-22)
  { name: '19-dispatch-trucks', prompt: `Dump trucks on a highway at golden hour, construction fleet, hardworking, ${BRAND_STYLE}` },
  { name: '20-dispatch-route', prompt: `GPS route map glowing on a dark dashboard, logistics and routing, ${BRAND_STYLE}` },
  { name: '21-dispatch-dawn', prompt: `Construction site at dawn, first light hitting equipment, early morning grind, ${BRAND_STYLE}` },
  { name: '22-dispatch-concrete', prompt: `Concrete being poured with golden dust in the air, building foundations, ${BRAND_STYLE}` },

  // Sobriety & Resilience (23-25)
  { name: '23-sober-sunrise', prompt: `Person silhouette standing on mountain peak at sunrise, new beginning, strength, ${BRAND_STYLE}` },
  { name: '24-sober-phoenix', prompt: `Phoenix rising from golden embers, transformation and rebirth, dark background, ${BRAND_STYLE}` },
  { name: '25-sober-clarity', prompt: `Crystal clear water reflecting stars, clarity and peace, sobriety journey, ${BRAND_STYLE}` },

  // Angel Cloud & Community (26-28)
  { name: '26-angel-cloud', prompt: `Ethereal clouds with golden light and angel wing silhouettes, wellness platform, ${BRAND_STYLE}` },
  { name: '27-community-discord', prompt: `Network of glowing connected nodes, people forming a community constellation, ${BRAND_STYLE}` },
  { name: '28-community-brain', prompt: `Multiple brains connected by light streams, collective knowledge, feed the brain, ${BRAND_STYLE}` },

  // Alabama & Identity (29-30)
  { name: '29-alabama-night', prompt: `Southern rural road under starry night sky, Alabama countryside, peaceful and strong, ${BRAND_STYLE}` },
  { name: '30-alabama-porch', prompt: `Laptop open on a southern porch at sunset, small town tech builder, warm golden light, ${BRAND_STYLE}` },
];

async function downloadImage(prompt, filename) {
  const encoded = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=1200&height=630&nologo=true&seed=${Date.now()}`;
  const path = `./images/${filename}.jpg`;

  if (existsSync(path)) {
    console.log(`  SKIP ${filename} (already exists)`);
    return true;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    console.log(`  Generating ${filename}...`);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      console.log(`  FAIL ${filename}: HTTP ${res.status}`);
      return false;
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      console.log(`  FAIL ${filename}: not an image (${contentType})`);
      return false;
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    writeFileSync(path, buffer);
    console.log(`  OK   ${filename} (${(buffer.length / 1024).toFixed(0)}KB)`);
    return true;
  } catch (e) {
    const msg = e.name === 'AbortError' ? 'timed out' : e.message;
    console.log(`  FAIL ${filename}: ${msg}`);
    return false;
  }
}

async function main() {
  console.log(`\nGenerating ${PROMPTS.length} branded ShaneBrain images...\n`);

  let success = 0;
  let fail = 0;

  for (const { name, prompt } of PROMPTS) {
    const ok = await downloadImage(prompt, name);
    if (ok) success++;
    else fail++;

    // Longer delay between requests to avoid rate limiting
    await new Promise(r => setTimeout(r, 30000));
  }

  console.log(`\nRound complete: ${success} generated, ${fail} failed.`);

  if (fail > 0) {
    console.log(`\nRetrying failed images in 5 minutes...\n`);
    await new Promise(r => setTimeout(r, 300000));

    for (const { name, prompt } of PROMPTS) {
      const path = `./images/${name}.jpg`;
      if (existsSync(path)) continue;

      const ok = await downloadImage(prompt, name);
      if (ok) success++;
      await new Promise(r => setTimeout(r, 30000));
    }
  }

  const finalCount = PROMPTS.filter(p => existsSync(`./images/${p.name}.jpg`)).length;
  console.log(`\nFinal: ${finalCount}/30 images saved to ./images/`);
}

main();

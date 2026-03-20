/**
 * Campaign Content Queue
 * Manages the library of pre-written content and serves it to the scheduler
 * Content types: excerpts, behind-scenes, teasers, engagement, ecosystem
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, '../../content');

export class ContentQueue {
  constructor() {
    this.content = {
      excerpts: this.loadJson('excerpts.json'),
      behindScenes: this.loadJson('behind-scenes.json'),
      teasers: this.loadJson('teasers.json'),
      engagement: this.loadJson('engagement.json'),
      ecosystem: this.loadJson('ecosystem.json')
    };

    // Track what's been posted to avoid repeats
    this.postedFile = join(CONTENT_DIR, '.posted-history.json');
    this.posted = this.loadPosted();
  }

  loadJson(filename) {
    const path = join(CONTENT_DIR, filename);
    if (!existsSync(path)) return [];
    try {
      return JSON.parse(readFileSync(path, 'utf8'));
    } catch {
      return [];
    }
  }

  loadPosted() {
    if (!existsSync(this.postedFile)) return {};
    try {
      return JSON.parse(readFileSync(this.postedFile, 'utf8'));
    } catch {
      return {};
    }
  }

  savePosted() {
    writeFileSync(this.postedFile, JSON.stringify(this.posted, null, 2));
  }

  /**
   * Get next content item for a given type
   * Rotates through content, tracking what's been used
   * @param {string} type - 'excerpts' | 'behindScenes' | 'teasers' | 'engagement' | 'ecosystem'
   * @returns {object|null} Content item with { id, text, metadata }
   */
  getNext(type) {
    const items = this.content[type];
    if (!items || items.length === 0) return null;

    // Find first unposted item
    const key = `${type}`;
    if (!this.posted[key]) this.posted[key] = [];

    const unposted = items.filter(item => !this.posted[key].includes(item.id));

    if (unposted.length === 0) {
      // All posted — reset and start over
      this.posted[key] = [];
      return items[0];
    }

    return unposted[0];
  }

  /**
   * Mark a content item as posted
   */
  markPosted(type, itemId) {
    const key = `${type}`;
    if (!this.posted[key]) this.posted[key] = [];
    this.posted[key].push(itemId);
    this.savePosted();
  }

  /**
   * Get content by campaign schedule weight
   * Returns the right type based on the current campaign phase
   * Phase 1 (Week 1-2): Heavy excerpts + engagement
   * Phase 2 (Week 3-4): Mix of everything
   * Phase 3 (Week 5+): Teasers + behind-scenes + ecosystem
   */
  getScheduledContent() {
    const now = new Date();
    const campaignStart = new Date(process.env.CAMPAIGN_START_DATE || now.toISOString());
    const daysSinceStart = Math.floor((now - campaignStart) / (1000 * 60 * 60 * 24));

    let weights;
    if (daysSinceStart < 14) {
      // Phase 1: Blitz — heavy excerpts and engagement
      weights = { excerpts: 40, engagement: 30, behindScenes: 15, teasers: 10, ecosystem: 5 };
    } else if (daysSinceStart < 28) {
      // Phase 2: Sustain — balanced mix
      weights = { excerpts: 20, engagement: 20, behindScenes: 25, teasers: 20, ecosystem: 15 };
    } else {
      // Phase 3: Growth — teasers and ecosystem
      weights = { excerpts: 10, engagement: 15, behindScenes: 20, teasers: 35, ecosystem: 20 };
    }

    // Weighted random selection
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let random = Math.random() * total;

    for (const [type, weight] of Object.entries(weights)) {
      random -= weight;
      if (random <= 0) {
        const item = this.getNext(type);
        if (item) return { type, ...item };
        // Fallback to excerpts if selected type is empty
        break;
      }
    }

    // Fallback
    return this.getNext('excerpts') || this.getNext('engagement');
  }

  /**
   * Get stats about content library
   */
  getStats() {
    return {
      excerpts: this.content.excerpts.length,
      behindScenes: this.content.behindScenes.length,
      teasers: this.content.teasers.length,
      engagement: this.content.engagement.length,
      ecosystem: this.content.ecosystem.length,
      totalPosted: Object.values(this.posted).flat().length
    };
  }
}

/**
 * Campaign Analytics
 * Tracks post performance and generates reports
 * Stores data locally in JSON (upgrade to D1 when Cloudflare Worker is deployed)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../data');

export class CampaignAnalytics {
  constructor() {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    this.dataFile = join(DATA_DIR, 'campaign-analytics.json');
    this.data = this.load();
  }

  load() {
    if (!existsSync(this.dataFile)) {
      return { posts: [], dailyStats: {}, platformStats: {} };
    }
    try {
      return JSON.parse(readFileSync(this.dataFile, 'utf8'));
    } catch {
      return { posts: [], dailyStats: {}, platformStats: {} };
    }
  }

  save() {
    writeFileSync(this.dataFile, JSON.stringify(this.data, null, 2));
  }

  /**
   * Record a successful post
   */
  recordPost({ platform, contentType, postId, content, timestamp }) {
    const ts = timestamp || new Date().toISOString();
    const day = ts.split('T')[0];

    this.data.posts.push({
      platform,
      contentType,
      postId,
      content: content.substring(0, 200), // truncate for storage
      timestamp: ts
    });

    // Daily stats
    if (!this.data.dailyStats[day]) {
      this.data.dailyStats[day] = { total: 0, byPlatform: {}, byType: {} };
    }
    this.data.dailyStats[day].total++;
    this.data.dailyStats[day].byPlatform[platform] = (this.data.dailyStats[day].byPlatform[platform] || 0) + 1;
    this.data.dailyStats[day].byType[contentType] = (this.data.dailyStats[day].byType[contentType] || 0) + 1;

    // Platform lifetime stats
    if (!this.data.platformStats[platform]) {
      this.data.platformStats[platform] = { total: 0, firstPost: ts, lastPost: ts };
    }
    this.data.platformStats[platform].total++;
    this.data.platformStats[platform].lastPost = ts;

    this.save();
  }

  /**
   * Get campaign summary
   */
  getSummary() {
    const totalPosts = this.data.posts.length;
    const platforms = Object.keys(this.data.platformStats);
    const days = Object.keys(this.data.dailyStats);

    return {
      totalPosts,
      activePlatforms: platforms.length,
      platforms: this.data.platformStats,
      activeDays: days.length,
      avgPostsPerDay: days.length > 0 ? (totalPosts / days.length).toFixed(1) : 0,
      recentPosts: this.data.posts.slice(-10)
    };
  }

  /**
   * Get today's activity
   */
  getToday() {
    const today = new Date().toISOString().split('T')[0];
    return this.data.dailyStats[today] || { total: 0, byPlatform: {}, byType: {} };
  }
}

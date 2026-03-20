/**
 * Platform-specific content templates
 * Formats raw content for each platform's best practices
 */

export const templates = {
  /**
   * Twitter/X: Short, punchy, quotable
   */
  twitter: {
    excerpt: (item) =>
      `"${item.text}"\n\n— You Probably Think This Book Is About You\n\n${item.hashtags.slice(0, 1).map(h => `#${h}`).join(' ')}`,

    teaser: (item) =>
      `${item.text}\n\n#volumetwo #noir`,

    engagement: (item) =>
      item.text,

    behindScenes: (item) =>
      `${item.text}\n\n#writingprocess`,

    ecosystem: (item) =>
      `${item.text}`
  },

  /**
   * Facebook: Conversational, no hashtag overload
   */
  facebook: {
    excerpt: (item) =>
      `"${item.text}"\n\nFrom "You Probably Think This Book Is About You" — a noir detective collection where every scene is about you, until it isn't.\n\nAvailable now on Amazon (ebook, print, audiobook).`,

    teaser: (item) =>
      `${item.title}\n\n${item.text}\n\nVolume Two is coming. The detective returns.`,

    engagement: (item) =>
      item.text,

    behindScenes: (item) =>
      `Behind the Scenes: ${item.title}\n\n${item.text}`,

    ecosystem: (item) =>
      `${item.title}\n\n${item.text}`
  },

  /**
   * Reddit: Genuine, markdown, value-first
   */
  reddit: {
    excerpt: (item) => ({
      title: `"${item.text.substring(0, 100)}..." — from my noir detective collection`,
      body: `> ${item.text}\n\nThis is from Scene ${item.scene}: *${item.title}* — one of 22 interconnected noir vignettes in "You Probably Think This Book Is About You."\n\nThe detective has no name. The book has no villain. Every scene is about observation, identity, and the things you notice when you finally look up.\n\nCo-created with Claude AI — I recorded raw voice dumps while driving and living, and the AI shaped them into noir prose. It never invented a single story.\n\nAvailable on Amazon (ebook, print, 78-minute audiobook).`
    }),

    behindScenes: (item) => ({
      title: `${item.title} — How I co-wrote a noir book with AI`,
      body: `${item.text}\n\n---\n\nThe book is called "You Probably Think This Book Is About You" — 22 noir vignettes about a detective who discovers his own case file. Written collaboratively with Claude AI, narrated by ElevenLabs.\n\nThe whole process is documented publicly: raw voice dumps → AI shaping → human approval → locked scene.\n\nHappy to answer questions about the process.`
    })
  },

  /**
   * Discord: Community-friendly, embed-ready
   */
  discord: {
    excerpt: (item) => ({
      embed: {
        title: `Scene ${item.scene}: ${item.title}`,
        description: `> ${item.text}`,
        color: 0xc9a84c, // gold
        footer: { text: 'You Probably Think This Book Is About You' }
      }
    }),

    trackDrop: (item) => ({
      channel: 'track-drops',
      embed: {
        title: `🎵 ${item.title}`,
        description: item.text,
        color: 0x00ff88, // green
        footer: { text: 'Volume Two — Coming Soon' }
      }
    }),

    behindScenes: (item) => ({
      embed: {
        title: `Behind the Scenes: ${item.title}`,
        description: item.text,
        color: 0x00d4ff // cyan
      }
    })
  },

  /**
   * LinkedIn: Professional, insight-driven
   */
  linkedin: {
    excerpt: (item) =>
      `"${item.text}"\n\nThis line is from "You Probably Think This Book Is About You" — a noir detective collection I co-created with Claude AI.\n\nThe process: I recorded raw voice memos while driving. The AI shaped them into noir prose. It never invented a story — it found the story inside my lived experience.\n\nThis is what human-AI collaboration looks like when you let the human lead.\n\nWhat's your experience with AI as a creative tool?`,

    behindScenes: (item) =>
      `${item.text}\n\nThe book runs on the same philosophy as the rest of my work: local-first infrastructure, no cloud dependency, real tools for real people.\n\nAll of this runs on a Raspberry Pi in a closet. Because if you don't own your infrastructure, you don't own your future.\n\nWhat are you building from nothing?`,

    ecosystem: (item) =>
      `${item.text}\n\nThis is part of the ShaneBrain ecosystem — local-first AI tools built to serve the ~800 million people Big Tech is about to leave behind.\n\nLearn more at thebardchat.github.io`
  },

  /**
   * Bluesky: Concise, link-friendly
   */
  bluesky: {
    excerpt: (item) =>
      `"${item.text}"\n\n— You Probably Think This Book Is About You\nNoir. No names. 22 scenes. Available on Amazon.`,

    teaser: (item) =>
      `${item.text}\n\n#volumetwo #noir`,

    behindScenes: (item) =>
      `${item.text}\n\n#writingprocess #AI #noir`
  }
};

/**
 * Format content for a specific platform and type
 */
export function formatForPlatform(platform, type, item) {
  const platformTemplates = templates[platform];
  if (!platformTemplates) return item.text;

  const formatter = platformTemplates[type];
  if (!formatter) return item.text;

  return formatter(item);
}

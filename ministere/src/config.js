import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_DIR = path.join(ROOT, 'data');
export const MEDIA_DIR = path.join(DATA_DIR, 'media');
// Voix du gouverneur enregistrées par toi : jamais effacées par un nouveau rendu.
export const VOICES_DIR = path.join(DATA_DIR, 'voices');
fs.mkdirSync(MEDIA_DIR, { recursive: true });
fs.mkdirSync(VOICES_DIR, { recursive: true });

const env = process.env;

export const config = {
  port: Number(env.PORT || 3000),
  publicUrl: (env.PUBLIC_URL || `http://localhost:${env.PORT || 3000}`).replace(/\/$/, ''),
  dashboard: { user: env.DASHBOARD_USER || 'ministre', password: env.DASHBOARD_PASSWORD || '' },
  claude: {
    apiKey: env.ANTHROPIC_API_KEY || '',
    model: env.CLAUDE_MODEL || 'claude-opus-5-5',
    fallbacks: env.CLAUDE_FALLBACKS !== '0',
  },
  discord: {
    token: env.DISCORD_BOT_TOKEN || '',
    guildId: env.DISCORD_GUILD_ID || '',
    inviteChannelId: env.DISCORD_INVITE_CHANNEL_ID || '',
    announceChannelId: env.DISCORD_ANNOUNCE_CHANNEL_ID || '',
    fallbackInvite: env.DISCORD_FALLBACK_INVITE || '',
  },
  chromiumPath: env.CHROMIUM_PATH || '',
  tts: {
    provider: env.TTS_PROVIDER || 'none',
    elevenKey: env.ELEVENLABS_API_KEY || '',
    elevenVoice: env.ELEVENLABS_VOICE_ID || '',
    piperBin: env.PIPER_BIN || 'piper',
    piperModel: env.PIPER_MODEL || '',
  },
  scheduler: {
    enabled: env.SCHEDULER_ENABLED !== '0',
    dailyCron: env.DAILY_GENERATION_CRON || '0 6 * * *',
    postsPerDay: Number(env.POSTS_PER_DAY || 3),
  },
};

export function loadCampaign() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'campaign.json'), 'utf8'));
}

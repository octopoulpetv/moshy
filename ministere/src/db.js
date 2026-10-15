import Database from 'better-sqlite3';
import path from 'node:path';
import { DATA_DIR } from './config.js';

export const db = new Database(path.join(DATA_DIR, 'ministere.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS briefs (
  id INTEGER PRIMARY KEY,
  created_at TEXT DEFAULT (datetime('now')),
  phase TEXT, format TEXT, angle TEXT, theme TEXT, hook TEXT, rationale TEXT,
  platforms TEXT,                -- JSON array
  status TEXT DEFAULT 'pending'  -- pending | written | failed
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY,
  brief_id INTEGER REFERENCES briefs(id),
  created_at TEXT DEFAULT (datetime('now')),
  phase TEXT, format TEXT, angle TEXT, theme TEXT,
  title TEXT,
  content TEXT,                  -- JSON : contenu structuré (visuel, scènes, voix off)
  captions TEXT,                 -- JSON : { plateforme: { text, hashtags } }
  status TEXT DEFAULT 'draft',   -- draft | rendering | ready | approved | rejected | published
  media TEXT,                    -- JSON : liste de fichiers rendus
  error TEXT,
  review_note TEXT
);

-- Une ligne par (post, plateforme) : lien tracké + stats
CREATE TABLE IF NOT EXISTS publications (
  id INTEGER PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  platform TEXT,
  code TEXT UNIQUE,              -- lien court /go/<code>
  published_at TEXT,
  url TEXT,
  views INTEGER, likes INTEGER, comments INTEGER, shares INTEGER,
  UNIQUE(post_id, platform)
);

CREATE TABLE IF NOT EXISTS clicks (
  id INTEGER PRIMARY KEY,
  code TEXT, at TEXT DEFAULT (datetime('now')),
  ua TEXT, ref TEXT, ip_hash TEXT
);

-- Invitations Discord par plateforme
CREATE TABLE IF NOT EXISTS invites (
  platform TEXT PRIMARY KEY,
  code TEXT, url TEXT, uses INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS joins (
  id INTEGER PRIMARY KEY,
  at TEXT DEFAULT (datetime('now')),
  member_id TEXT, platform TEXT, invite_code TEXT,
  left_at TEXT
);

CREATE TABLE IF NOT EXISTS api_usage (
  id INTEGER PRIMARY KEY,
  at TEXT DEFAULT (datetime('now')),
  purpose TEXT, model TEXT,
  input_tokens INTEGER, output_tokens INTEGER,
  cache_read INTEGER, cache_write INTEGER
);

CREATE TABLE IF NOT EXISTS insights (
  id INTEGER PRIMARY KEY,
  at TEXT DEFAULT (datetime('now')),
  summary TEXT                   -- JSON produit par le stratège
);
`);

export const json = (v, fallback = null) => {
  if (v == null) return fallback;
  try { return JSON.parse(v); } catch { return fallback; }
};

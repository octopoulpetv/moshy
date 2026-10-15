// Bot Discord : invitations par plateforme, comptage des arrivées par source, annonces.
import path from 'node:path';
import { Client, GatewayIntentBits, Events, AttachmentBuilder } from 'discord.js';
import { config, loadCampaign, MEDIA_DIR } from '../config.js';
import { db, json } from '../db.js';
import { finalCaption } from '../links.js';

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), '[discord]', ...a);

let client = null;
let ready = false;
const uses = new Map(); // code d'invitation → nombre d'utilisations connu

export const discordStatus = () => ({ configured: Boolean(config.discord.token && config.discord.guildId), ready });

async function snapshotInvites(guild) {
  const invites = await guild.invites.fetch();
  uses.clear();
  for (const inv of invites.values()) uses.set(inv.code, inv.uses ?? 0);
  return invites;
}

/** Crée une invitation permanente par plateforme si elle n'existe pas encore. */
async function ensureInvites(guild) {
  const invites = await snapshotInvites(guild);
  const channelId = config.discord.inviteChannelId;
  if (!channelId) { log('DISCORD_INVITE_CHANNEL_ID absent : pas de création d\'invitations'); return; }
  const channel = await guild.channels.fetch(channelId);
  const upsert = db.prepare('INSERT INTO invites (platform, code, url) VALUES (?, ?, ?) ON CONFLICT(platform) DO UPDATE SET code = excluded.code, url = excluded.url');

  for (const platform of [...Object.keys(loadCampaign().platforms).filter((p) => p !== 'discord'), 'site']) {
    const known = db.prepare('SELECT code FROM invites WHERE platform = ?').get(platform);
    if (known && invites.has(known.code)) continue;
    const inv = await channel.createInvite({ maxAge: 0, maxUses: 0, unique: true, reason: `Ministère : invitation ${platform}` });
    upsert.run(platform, inv.code, inv.url);
    uses.set(inv.code, 0);
    log(`invitation créée pour ${platform} : ${inv.url}`);
  }
}

export async function startDiscord() {
  if (!discordStatus().configured) { log('non configuré (DISCORD_BOT_TOKEN / DISCORD_GUILD_ID)'); return; }
  client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildInvites] });

  client.once(Events.ClientReady, async (c) => {
    try {
      const guild = await c.guilds.fetch(config.discord.guildId);
      await ensureInvites(guild);
      ready = true;
      log(`connecté en tant que ${c.user.tag} sur « ${guild.name} »`);
    } catch (e) {
      log('erreur au démarrage :', e.message, '— vérifie la permission « Gérer le serveur » du bot');
    }
  });

  client.on(Events.InviteCreate, (inv) => uses.set(inv.code, inv.uses ?? 0));
  client.on(Events.InviteDelete, (inv) => uses.delete(inv.code));

  client.on(Events.GuildMemberAdd, async (member) => {
    if (member.guild.id !== config.discord.guildId) return;
    const before = new Map(uses);
    let code = null;
    try {
      const invites = await snapshotInvites(member.guild);
      for (const inv of invites.values()) if ((inv.uses ?? 0) > (before.get(inv.code) ?? 0)) { code = inv.code; break; }
    } catch (e) { log('lecture des invitations impossible :', e.message); }
    const platform = code ? db.prepare('SELECT platform FROM invites WHERE code = ?').get(code)?.platform ?? null : null;
    db.prepare('INSERT INTO joins (member_id, platform, invite_code) VALUES (?, ?, ?)').run(member.id, platform, code);
    log(`arrivée : ${member.user.tag} ← ${platform ?? code ?? 'source inconnue'}`);
  });

  client.on(Events.GuildMemberRemove, (member) => {
    db.prepare(`UPDATE joins SET left_at = datetime('now') WHERE member_id = ? AND left_at IS NULL`).run(member.id);
  });

  await client.login(config.discord.token);
}

/** Publie un post validé dans le salon d'annonces. */
export async function publishToDiscord(postId) {
  if (!ready) throw new Error('Bot Discord non connecté');
  if (!config.discord.announceChannelId) throw new Error('DISCORD_ANNOUNCE_CHANNEL_ID manquant');
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId);
  const caption = json(post.captions, {}).discord;
  if (!caption) throw new Error('Ce post n\'a pas de légende Discord');
  const media = json(post.media, []);
  const main = media.find((m) => m.kind === 'video') || media.find((m) => m.ratio === '4:5') || media[0];
  const channel = await client.channels.fetch(config.discord.announceChannelId);
  const msg = await channel.send({
    content: finalCaption(post, caption).slice(0, 2000),
    files: main ? [new AttachmentBuilder(path.join(MEDIA_DIR, main.file))] : [],
  });
  db.prepare(`UPDATE publications SET published_at = datetime('now'), url = ? WHERE post_id = ? AND platform = 'discord'`).run(msg.url, postId);
  return msg.url;
}

// Lavalink-based music handler.
//
// Replaces the previous DisTube + @distube/youtube setup. Lavalink runs as
// a separate audio server (Java) and handles all the YouTube/Spotify
// extraction server-side, which avoids the HTTP 429 bot-detection that
// kills client-side ytdl on cloud hosts (Railway, Fly, Render, etc.).
//
// Connect to a public node by default; override per-deploy via env vars:
//   LAVALINK_HOST     (default: lavalink.jirayu.net)
//   LAVALINK_PORT     (default: 13592)
//   LAVALINK_PASSWORD (default: youshallnotpass)
//   LAVALINK_SECURE   (default: false; "true" to use wss:// + https://)
//
// Public node list (rotate if any go down):
//   lavalink.jirayu.net:13592   pass: youshallnotpass            secure: false
//   lava-v4.ajieblogs.eu.org:80 pass: https://dsc.gg/ajidevserver secure: false

const { LavalinkManager } = require('lavalink-client');
const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { approve, warn, deny } = require('../emojis.json');

module.exports = (client) => {
  const node = {
    id: 'main',
    host: process.env.LAVALINK_HOST || 'lavalink.jirayu.net',
    port: Number(process.env.LAVALINK_PORT) || 13592,
    authorization: process.env.LAVALINK_PASSWORD || 'youshallnotpass',
    secure: String(process.env.LAVALINK_SECURE || 'false').toLowerCase() === 'true',
    retryAmount: 5,
    retryDelay: 10_000,
  };

  const manager = new LavalinkManager({
    nodes: [node],
    sendToShard: (guildId, payload) =>
      client.guilds.cache.get(guildId)?.shard?.send(payload),
    autoSkip: true,
    playerOptions: {
      defaultSearchPlatform: 'ytsearch',
      onDisconnect: { autoReconnect: true, destroyPlayer: false },
      onEmptyQueue: { destroyAfterMs: 60_000 },
    },
  });

  client.lavalink = manager;

  // Lavalink needs Discord's raw voice events to drive the connection.
  client.on('raw', (d) => manager.sendRawData(d));

  client.once('ready', () => {
    manager
      .init({ id: client.user.id, username: client.user.username })
      .then(() => console.log('[music] Lavalink manager initialized.'))
      .catch((e) => console.error('[music] Lavalink init failed:', e));
  });

  const embed = (text, c = color) =>
    new EmbedBuilder().setColor(c).setDescription(text);

  manager.nodeManager
    .on('connect', (n) => console.log(`[music] Connected to Lavalink node "${n.id}" (${n.options.host}:${n.options.port}).`))
    .on('disconnect', (n, reason) => console.warn(`[music] Lavalink node "${n.id}" disconnected:`, reason?.reason || reason))
    .on('reconnecting', (n) => console.warn(`[music] Lavalink node "${n.id}" reconnecting...`))
    .on('error', (n, err) => console.error(`[music] Lavalink node "${n.id}" error:`, err?.message || err));

  manager
    .on('trackStart', (player, track) => {
      const ch = client.channels.cache.get(player.textChannelId);
      const requester = track.requester ? `<@${track.requester.id}>` : 'unknown';
      const dur = formatMs(track.info.duration);
      ch?.send({
        embeds: [embed(`${approve} Now playing: **[${track.info.title}](${track.info.uri})** \`[${dur}]\` — requested by ${requester}`)],
      }).catch(() => {});
    })
    .on('trackEnd', (player, track, payload) => {
      // No message — keeps the channel quiet between tracks.
    })
    .on('queueEnd', (player) => {
      const ch = client.channels.cache.get(player.textChannelId);
      ch?.send({ embeds: [embed(`${approve} Queue finished.`)] }).catch(() => {});
    })
    .on('playerDestroy', (player, reason) => {
      const ch = client.channels.cache.get(player.textChannelId);
      if (reason && reason !== 'destroy') {
        ch?.send({ embeds: [embed(`${warn} Disconnected: ${reason}`, '#efa23a')] }).catch(() => {});
      }
    })
    .on('trackError', (player, track, payload) => {
      const ch = client.channels.cache.get(player.textChannelId);
      console.error('[music] Track error:', payload?.exception || payload);
      ch?.send({
        embeds: [embed(`${deny} Playback error: \`${payload?.exception?.message || 'unknown error'}\``, '#ff5555')],
      }).catch(() => {});
    });

  console.log(`[music] Lavalink configured (${node.host}:${node.port}, secure=${node.secure}). Will connect on ready.`);
};

function formatMs(ms) {
  if (!ms || ms < 0) return '0:00';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

module.exports.formatMs = formatMs;

// Lavalink-based music handler.
//
// Replaces the previous DisTube + @distube/youtube setup. Lavalink runs as
// a separate audio server (Java) and handles all the YouTube/Spotify
// extraction server-side, which avoids the HTTP 429 bot-detection that
// kills client-side ytdl on cloud hosts (Railway, Fly, Render, etc.).
//
// Three ways to configure the nodes (most specific wins):
//
//   1. LAVALINK_NODES — comma-separated list of full node specs:
//        host:port:password:secure   (secure = true|false)
//      e.g. "node1.example.com:443:mypass:true,node2.example.com:2333:mypass:false"
//
//   2. Single node via individual vars:
//        LAVALINK_HOST, LAVALINK_PORT, LAVALINK_PASSWORD, LAVALINK_SECURE
//
//   3. Default public node fallbacks (used when no env vars are set).
//      Public nodes are flaky — host your own if you need reliability.

const { LavalinkManager } = require('lavalink-client');
const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { approve, warn, deny } = require('../emojis.json');

const DEFAULT_PUBLIC_NODES = [
  { id: 'ajieblogs', host: 'lava-v4.ajieblogs.eu.org', port: 80, authorization: 'https://dsc.gg/ajidevserver', secure: false },
  { id: 'serenetia', host: 'lavalinkv4.serenetia.com', port: 443, authorization: 'https://dsc.gg/ajidevserver', secure: true },
  // 'inza' (lavalink.inza.fun) removed — DNS no longer resolves and it spams reconnect loops.
];

function resolveNodes() {
  if (process.env.LAVALINK_NODES) {
    const list = process.env.LAVALINK_NODES.split(',').map(s => s.trim()).filter(Boolean);
    const nodes = [];
    for (let i = 0; i < list.length; i++) {
      const [host, port, password, secure] = list[i].split(':');
      if (!host || !port) continue;
      nodes.push({
        id: `node${i + 1}`,
        host,
        port: Number(port),
        authorization: password || 'youshallnotpass',
        secure: String(secure || 'false').toLowerCase() === 'true',
        retryAmount: 5,
        retryDelay: 10_000,
      });
    }
    if (nodes.length) return nodes;
  }
  if (process.env.LAVALINK_HOST) {
    return [{
      id: 'main',
      host: process.env.LAVALINK_HOST,
      port: Number(process.env.LAVALINK_PORT) || 2333,
      authorization: process.env.LAVALINK_PASSWORD || 'youshallnotpass',
      secure: String(process.env.LAVALINK_SECURE || 'false').toLowerCase() === 'true',
      retryAmount: 5,
      retryDelay: 10_000,
    }];
  }
  return DEFAULT_PUBLIC_NODES.map(n => ({ ...n, retryAmount: 5, retryDelay: 10_000 }));
}

module.exports = (client) => {
  const nodes = resolveNodes();

  const manager = new LavalinkManager({
    nodes,
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

  console.log(`[music] Lavalink configured with ${nodes.length} node(s):`);
  for (const n of nodes) console.log(`         - ${n.id}: ${n.host}:${n.port} (secure=${n.secure})`);
  console.log('[music] Will connect on ready.');

  // lavalink-client throws uncaught errors from inside _LavalinkNode.open
  // (e.g. when a node returns garbage instead of /v4/info JSON). Without a
  // global handler, ONE bad node crashes the whole bot. Swallow them — the
  // manager will move on to other nodes / retry on its own.
  const swallow = (reason) => {
    const txt = reason?.stack || reason?.message || String(reason);
    if (/lavalink|v4\/info|ON-OPEN-FETCH/i.test(txt)) {
      console.warn('[music] swallowed Lavalink node error:', (reason?.message || String(reason)).slice(0, 200));
      return true;
    }
    return false;
  };
  process.on('unhandledRejection', (reason) => { swallow(reason); });
  process.on('uncaughtException', (err) => {
    if (!swallow(err)) {
      console.error('[uncaughtException]', err);
    }
  });
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

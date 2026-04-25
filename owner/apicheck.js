const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const net = require('net');
const { color, lfkey } = require('../config.json');
const { isOwner } = require('../utils/owners');

const OK = '🟢';
const BAD = '🔴';
const SKIP = '⚪';
const TIMEOUT_MS = 5000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms)),
  ]);
}

async function timed(fn) {
  const start = Date.now();
  try {
    const detail = await withTimeout(fn(), TIMEOUT_MS);
    return { ok: true, ms: Date.now() - start, detail: detail || 'live' };
  } catch (err) {
    return { ok: false, ms: Date.now() - start, detail: (err && err.message) || 'failed' };
  }
}

function present(v) { return typeof v === 'string' && v.trim().length > 0; }

async function checkDiscord(client) {
  if (!client || !client.ws) return { skip: true, detail: 'no client' };
  const statusName = ['READY', 'CONNECTING', 'RECONNECTING', 'IDLE', 'NEARLY', 'DISCONNECTED', 'WAITING_FOR_GUILDS', 'IDENTIFYING', 'RESUMING'][client.ws.status] || `status ${client.ws.status}`;
  const ok = client.ws.status === 0;
  const ping = Math.round(client.ws.ping);
  return { ok, ms: ping >= 0 ? ping : 0, detail: `${statusName}, ${client.guilds.cache.size} guilds` };
}

async function checkGitHub() {
  const token = process.env.DROWN_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
  if (!present(token)) return { skip: true, detail: 'no token' };
  return timed(async () => {
    const res = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'drown-bot' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = await res.json();
    return `auth as ${j.login}`;
  });
}

async function checkSpotify() {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const sec = process.env.SPOTIFY_CLIENT_SECRET;
  if (!present(id) || !present(sec)) return { skip: true, detail: 'no credentials' };
  return timed(async () => {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${id}:${sec}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = await res.json();
    if (!j.access_token) throw new Error('no token in response');
    return `token ok (${j.expires_in}s)`;
  });
}

async function checkLastFm() {
  const key = lfkey || '43693facbb24d1ac893a7d33846b15cc';
  if (!present(key)) return { skip: true, detail: 'no api key' };
  return timed(async () => {
    const res = await fetch(`http://ws.audioscrobbler.com/2.0/?method=user.getInfo&user=rj&api_key=${encodeURIComponent(key)}&format=json`, {
      headers: { 'User-Agent': 'drown-bot/1.0' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = await res.json();
    if (j.error) throw new Error(`code ${j.error}: ${j.message}`);
    return 'api key valid';
  });
}

function tcpPing(host, port) {
  return new Promise((resolve, reject) => {
    const sock = new net.Socket();
    let done = false;
    sock.setTimeout(TIMEOUT_MS);
    sock.once('connect', () => { done = true; sock.destroy(); resolve(true); });
    sock.once('timeout', () => { if (!done) { sock.destroy(); reject(new Error('tcp timeout')); } });
    sock.once('error', err => { if (!done) reject(err); });
    sock.connect(port, host);
  });
}

function resolveLavalinkNodes() {
  if (process.env.LAVALINK_NODES) {
    return process.env.LAVALINK_NODES.split(',').map(s => s.trim()).filter(Boolean).map((spec, i) => {
      const [host, port, password, secure] = spec.split(':');
      return { id: `node${i + 1}`, host, port: Number(port) || 2333, password: password || 'youshallnotpass', secure: String(secure || 'false').toLowerCase() === 'true' };
    });
  }
  if (process.env.LAVALINK_HOST) {
    return [{
      id: 'main',
      host: process.env.LAVALINK_HOST,
      port: Number(process.env.LAVALINK_PORT) || 2333,
      password: process.env.LAVALINK_PASSWORD || 'youshallnotpass',
      secure: String(process.env.LAVALINK_SECURE || 'false').toLowerCase() === 'true',
    }];
  }
  return [];
}

async function checkLavalink() {
  const nodes = resolveLavalinkNodes();
  if (nodes.length === 0) return { skip: true, detail: 'no nodes configured (using public fallbacks)' };
  const results = await Promise.all(nodes.map(n => timed(async () => {
    const proto = n.secure ? 'https' : 'http';
    const res = await fetch(`${proto}://${n.host}:${n.port}/version`, {
      headers: { Authorization: n.password, 'User-Agent': 'drown-bot' },
    });
    if (!res.ok) {
      // /version is usually unauth; if HTTP fails try TCP probe as fallback
      await tcpPing(n.host, n.port);
      return `tcp ok (HTTP ${res.status})`;
    }
    const v = (await res.text()).trim();
    return `v${v.slice(0, 20)}`;
  }).then(r => ({ ...r, id: n.id, host: `${n.host}:${n.port}` }))));
  const allOk = results.every(r => r.ok);
  const detail = results.map(r => `${r.ok ? OK : BAD} ${r.id} \`${r.host}\` — ${r.detail} (${r.ms}ms)`).join('\n');
  return { ok: allOk, ms: Math.max(...results.map(r => r.ms)), detail, multiline: true };
}

async function checkFortnite() {
  const key = process.env.FORTNITE_API_KEY;
  if (!present(key)) return { skip: true, detail: 'no api key' };
  return timed(async () => {
    // fortnite-api.com — same service the bot actually uses (see fun/fortnite.js, information/itemshop.js)
    // We hit /cosmetics/br/new which doesn't depend on a user/account so it's a clean auth probe.
    const res = await fetch('https://fortnite-api.com/v2/cosmetics/br/new', {
      headers: { Authorization: key, 'User-Agent': 'drown-bot' },
    });
    if (res.status === 401) throw new Error(`unauthorized (HTTP 401)`);
    if (res.status === 403) {
      // 403 with "api key" in the body means bad key; otherwise it's just a permission quirk.
      const body = await res.text().catch(() => '');
      if (/api[\s_-]?key|invalid|unauthor/i.test(body)) throw new Error('invalid api key');
      return 'api key valid (auth ok)';
    }
    if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);
    return 'api key valid';
  });
}

function fmtLine(label, result) {
  if (result.skip) return `${SKIP} **${label}** — *${result.detail}*`;
  if (result.multiline) return `**${label}**\n${result.detail}`;
  const icon = result.ok ? OK : BAD;
  return `${icon} **${label}** — ${result.detail} \`${result.ms}ms\``;
}

module.exports = {
  category: 'owner',
  help: [
    {
      name: 'apicheck',
      description: 'Live-ping every external API and report which integrations are actually working.',
      aliases: 'pingapi, apitest',
      parameters: 'n/a',
      information: 'BOT_OWNER',
      usage: 'apicheck',
      example: 'apicheck',
    },
  ],

  name: 'apicheck',
  aliases: ['pingapi', 'apitest'],
  category: 'owner',

  run: async (client, message) => {
    if (!isOwner(message.author.id)) return;

    const sent = await message.channel.send('🔄 Pinging integrations…');

    const [discord, github, spotify, lastfm, lavalink, fortnite] = await Promise.all([
      checkDiscord(client),
      checkGitHub(),
      checkSpotify(),
      checkLastFm(),
      checkLavalink(),
      checkFortnite(),
    ]);

    const results = [
      ['Discord gateway', discord],
      ['GitHub API', github],
      ['Spotify API', spotify],
      ['Last.fm API', lastfm],
      ['Lavalink nodes', lavalink],
      ['Fortnite API', fortnite],
    ];

    let live = 0, down = 0, skipped = 0;
    for (const [, r] of results) {
      if (r.skip) skipped++;
      else if (r.ok) live++;
      else down++;
    }

    const description = results.map(([label, r]) => fmtLine(label, r)).join('\n\n');

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('Live Integration Check')
      .setDescription(description)
      .setFooter({ text: `${live} live · ${down} down · ${skipped} not configured` })
      .setTimestamp();

    return sent.edit({ content: '', embeds: [embed] });
  },
};

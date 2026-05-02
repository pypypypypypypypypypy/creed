// OSINT lookup engines — all free, no API keys required.
const fetch = require('node-fetch');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const T  = 10000;

function isEmail(s)     { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim()); }
function isDiscordId(s) { return /^\d{17,20}$/.test(s.trim()); }

async function safeFetch(url, opts = {}) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, ...opts.headers }, timeout: T, redirect: 'follow', ...opts });
    return r;
  } catch { return null; }
}

// ── 1. emailrep.io ────────────────────────────────────────────────────────
// Returns reputation, breach flag, profiles, blacklisted, disposable, spam.
async function queryEmailRep(email) {
  const r = await safeFetch(`https://emailrep.io/${encodeURIComponent(email)}`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!r || !r.ok) return null;
  try { return await r.json(); } catch { return null; }
}

// ── 2. HudsonRock Cavalier (infostealer logs) ─────────────────────────────
// Searches malware/infostealer captured credentials databases.
async function queryHudsonRockEmail(email) {
  const r = await safeFetch(
    `https://cavalier.hudsonrock.com/api/json/v2/osint-tools/search-by-email?email=${encodeURIComponent(email)}`
  );
  if (!r || !r.ok) return null;
  try { return await r.json(); } catch { return null; }
}

async function queryHudsonRockUsername(username) {
  const r = await safeFetch(
    `https://cavalier.hudsonrock.com/api/json/v2/osint-tools/search-by-username?username=${encodeURIComponent(username)}`
  );
  if (!r || !r.ok) return null;
  try { return await r.json(); } catch { return null; }
}

// ── 3. LeakCheck.io (public endpoint — breach source list) ───────────────
async function queryLeakCheck(email) {
  const r = await safeFetch(`https://leakcheck.io/api/public?check=${encodeURIComponent(email)}`);
  if (!r || !r.ok) return null;
  try { return await r.json(); } catch { return null; }
}

// ── 4. Discord API user lookup (by snowflake ID) ──────────────────────────
async function queryDiscordUser(id, botToken) {
  if (!botToken || !isDiscordId(id)) return null;
  const r = await safeFetch(`https://discord.com/api/v10/users/${id}`, {
    headers: { 'Authorization': `Bot ${botToken}`, 'Accept': 'application/json' },
  });
  if (!r || !r.ok) return null;
  try { return await r.json(); } catch { return null; }
}

// ── 5. Platform existence checker (sherlock-style) ────────────────────────
const PLATFORMS = [
  { name: 'GitHub',     check: async u => { const r = await safeFetch(`https://api.github.com/users/${u}`, { headers: { 'Accept': 'application/vnd.github+json' } }); return r?.status === 200; } },
  { name: 'Reddit',     check: async u => { const r = await safeFetch(`https://www.reddit.com/user/${u}/about.json`); return r?.status === 200; } },
  { name: 'TikTok',     check: async u => { const r = await safeFetch(`https://www.tiktok.com/@${u}`); return r?.status === 200; } },
  { name: 'Twitch',     check: async u => { const r = await safeFetch(`https://www.twitch.tv/${u}`); return r?.status === 200; } },
  { name: 'Steam',      check: async u => { const r = await safeFetch(`https://steamcommunity.com/id/${u}`); if (!r || r.status !== 200) return false; const html = await r.text().catch(() => ''); return !html.includes('The specified profile could not be found'); } },
  { name: 'Roblox',     check: async u => { const r = await safeFetch(`https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(u)}&limit=10`); if (!r || !r.ok) return false; try { const j = await r.json(); return j.data?.some(x => x.name?.toLowerCase() === u.toLowerCase()); } catch { return false; } } },
  { name: 'Instagram',  check: async u => { const r = await safeFetch(`https://www.instagram.com/${u}/`); return r?.status === 200 && !r.url?.includes('/accounts/login'); } },
  { name: 'Twitter/X',  check: async u => { const r = await safeFetch(`https://twitter.com/${u}`); return r?.status === 200; } },
  { name: 'Snapchat',   check: async u => { const r = await safeFetch(`https://www.snapchat.com/add/${u}`); return r?.status === 200; } },
  { name: 'Pinterest',  check: async u => { const r = await safeFetch(`https://www.pinterest.com/${u}/`); return r?.status === 200; } },
  { name: 'SoundCloud', check: async u => { const r = await safeFetch(`https://soundcloud.com/${u}`); return r?.status === 200; } },
  { name: 'Spotify',    check: async u => { const r = await safeFetch(`https://open.spotify.com/user/${u}`); return r?.status === 200; } },
  { name: 'Kick',       check: async u => { const r = await safeFetch(`https://kick.com/${u}`); return r?.status === 200; } },
];

async function checkAllPlatforms(username) {
  const settled = await Promise.allSettled(
    PLATFORMS.map(async p => ({ name: p.name, found: await p.check(username).catch(() => false) }))
  );
  return settled.filter(r => r.status === 'fulfilled').map(r => r.value);
}

// ── Snowflake → timestamp helper ─────────────────────────────────────────
function snowflakeToDate(id) {
  try {
    const ms = BigInt(id) >> 22n;
    return new Date(Number(ms) + 1420070400000);
  } catch { return null; }
}

module.exports = {
  isEmail, isDiscordId,
  queryEmailRep, queryHudsonRockEmail, queryHudsonRockUsername,
  queryLeakCheck, queryDiscordUser,
  checkAllPlatforms, snowflakeToDate,
};

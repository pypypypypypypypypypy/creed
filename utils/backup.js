// Discord-channel-based persistence layer.
//
// Why: most cheap hosts (Railway free, Render, Fly, etc.) wipe the working
// filesystem on every redeploy. db_data.json (welcome msgs, stats config,
// authorizations, economy, …) is then reset to whatever was last committed,
// so users have to reconfigure everything after every push.
//
// What this does: every time db.js writes to disk we also (debounced) upload
// db_data.json as an attachment to a single, private "bot-backup" channel.
// On startup, before client.login, we pull the most recent attachment from
// that channel and write it back to disk. The bot reads from disk normally
// from then on.
//
// Configuration: set env var BACKUP_CHANNEL_ID to the channel ID that
// the bot can post in. ,backup setup creates that channel for you.

const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'db_data.json');
const API = 'https://discord.com/api/v10';
const DEBOUNCE_MS = 15_000;
const SHUTDOWN_TIMEOUT_MS = 8_000;

const token = () => process.env.DISCORD_TOKEN || process.env.TOKEN;
const channelId = () => process.env.BACKUP_CHANNEL_ID || null;

let writeTimer = null;
let lastBackupAt = null;
let lastRestoreAt = null;
let lastError = null;
let inFlight = false;

async function discordJson(method, urlPath) {
  const res = await fetch(`${API}${urlPath}`, {
    method,
    headers: {
      Authorization: `Bot ${token()}`,
      'User-Agent': 'drown-xd-backup (1.0)',
    },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`${method} ${urlPath} ${res.status}: ${txt.slice(0, 200)}`);
  }
  return res.json();
}

async function restoreFromChannel() {
  const ch = channelId();
  if (!token()) return { restored: false, reason: 'bot token not set' };
  if (!ch) return { restored: false, reason: 'BACKUP_CHANNEL_ID env var not set — run ,backup setup' };

  try {
    const messages = await discordJson('GET', `/channels/${ch}/messages?limit=20`);
    const msg = messages.find(
      (m) => Array.isArray(m.attachments) && m.attachments.some((a) => a.filename && a.filename.endsWith('.json'))
    );
    if (!msg) return { restored: false, reason: 'no .json backup attachment in last 20 messages' };

    const att = msg.attachments.find((a) => a.filename && a.filename.endsWith('.json'));
    const r = await fetch(att.url);
    if (!r.ok) throw new Error(`download failed ${r.status}`);
    const text = await r.text();
    JSON.parse(text); // sanity — if this throws we don't clobber the local file
    fs.writeFileSync(DB_FILE, text);
    lastRestoreAt = Date.now();
    return { restored: true, ts: msg.timestamp, size: text.length };
  } catch (e) {
    lastError = e.message;
    return { restored: false, reason: e.message };
  }
}

async function uploadBackup() {
  const ch = channelId();
  if (!token() || !ch) return { ok: false, reason: 'not configured' };
  if (!fs.existsSync(DB_FILE)) return { ok: false, reason: 'db_data.json missing' };
  if (inFlight) return { ok: false, reason: 'another backup is already uploading' };

  inFlight = true;
  try {
    const buf = fs.readFileSync(DB_FILE);
    const fd = new FormData();
    fd.append(
      'payload_json',
      JSON.stringify({
        content: `\u{1F512} backup \u2022 <t:${Math.floor(Date.now() / 1000)}:R> \u2022 ${buf.length} bytes`,
      })
    );
    fd.append('files[0]', new Blob([buf], { type: 'application/json' }), `db_${Date.now()}.json`);

    const res = await fetch(`${API}/channels/${ch}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bot ${token()}` },
      body: fd,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`upload ${res.status}: ${txt.slice(0, 200)}`);
    }
    lastBackupAt = Date.now();
    return { ok: true, size: buf.length };
  } catch (e) {
    lastError = e.message;
    return { ok: false, reason: e.message };
  } finally {
    inFlight = false;
  }
}

// Called by db.js after every save. Coalesces bursts of writes into one
// upload ~15s after the last write.
function scheduleBackup() {
  if (!token() || !channelId()) return;
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    writeTimer = null;
    uploadBackup().catch(() => {});
  }, DEBOUNCE_MS);
}

async function flushPending() {
  if (writeTimer) {
    clearTimeout(writeTimer);
    writeTimer = null;
  }
  return uploadBackup();
}

function getStatus() {
  return {
    configured: !!(token() && channelId()),
    channelId: channelId(),
    lastBackupAt,
    lastRestoreAt,
    lastError,
    pendingFlush: !!writeTimer,
    debounceMs: DEBOUNCE_MS,
  };
}

module.exports = {
  restoreFromChannel,
  uploadBackup,
  scheduleBackup,
  flushPending,
  getStatus,
  SHUTDOWN_TIMEOUT_MS,
};

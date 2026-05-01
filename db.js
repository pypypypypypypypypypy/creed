const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'db_data.json');

// ---------- In-memory cache ----------
// Load once at startup. All reads are served from memory — zero disk IO per
// db.get() call. Writes update the in-memory object immediately and schedule
// a debounced flush so rapid back-to-back writes produce only one disk write.
let _cache = null;
let _dirty = false;
let _flushTimer = null;
const FLUSH_DEBOUNCE_MS = 500;

function getCache() {
  if (_cache === null) {
    if (!fs.existsSync(FILE)) { _cache = {}; return _cache; }
    try { _cache = JSON.parse(fs.readFileSync(FILE, 'utf8')); }
    catch { _cache = {}; }
  }
  return _cache;
}

// Lazy-resolve the backup module so this file stays usable even before
// utils/backup.js exists or if the user has not configured BACKUP_CHANNEL_ID.
let _backup = undefined;
function getBackup() {
  if (_backup === undefined) {
    try { _backup = require('./utils/backup'); } catch { _backup = null; }
  }
  return _backup;
}

function flushNow() {
  if (!_dirty || _cache === null) return;
  try {
    fs.writeFileSync(FILE, JSON.stringify(_cache, null, 2));
    _dirty = false;
    const b = getBackup();
    if (b && typeof b.scheduleBackup === 'function') b.scheduleBackup();
  } catch (e) {
    console.error('[db] flush failed:', e.message);
  }
}

function scheduleFlush() {
  _dirty = true;
  if (_flushTimer) clearTimeout(_flushTimer);
  _flushTimer = setTimeout(() => { _flushTimer = null; flushNow(); }, FLUSH_DEBOUNCE_MS);
}

// Expose so backup.flushPending / gracefulExit can force a synchronous write.
function flushPendingSync() {
  if (_flushTimer) { clearTimeout(_flushTimer); _flushTimer = null; }
  flushNow();
}

function resolvePath(data, keys) {
  let cur = data;
  for (const k of keys) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[k];
  }
  return cur;
}

function setPath(data, keys, value) {
  let cur = data;
  for (let i = 0; i < keys.length - 1; i++) {
    if (cur[keys[i]] == null || typeof cur[keys[i]] !== 'object') cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
}

function deletePath(data, keys) {
  let cur = data;
  for (let i = 0; i < keys.length - 1; i++) {
    if (cur == null || typeof cur !== 'object') return;
    cur = cur[keys[i]];
  }
  if (cur && typeof cur === 'object') delete cur[keys[keys.length - 1]];
}

function splitKey(key) {
  return key.split('.');
}

const db = {
  get(key) {
    const val = resolvePath(getCache(), splitKey(key));
    return val === undefined ? null : val;
  },

  fetch(key) {
    return this.get(key);
  },

  set(key, value) {
    setPath(getCache(), splitKey(key), value);
    scheduleFlush();
    return value;
  },

  has(key) {
    return this.get(key) !== null;
  },

  delete(key) {
    deletePath(getCache(), splitKey(key));
    scheduleFlush();
    return true;
  },

  add(key, amount) {
    const cur = this.get(key) || 0;
    return this.set(key, cur + amount);
  },

  subtract(key, amount) {
    const cur = this.get(key) || 0;
    return this.set(key, cur - amount);
  },

  push(key, element) {
    const arr = this.get(key) || [];
    arr.push(element);
    return this.set(key, arr);
  },

  // Force an immediate synchronous write — used by graceful shutdown.
  flushSync: flushPendingSync,
};

module.exports = db;

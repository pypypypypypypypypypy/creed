const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'db_data.json');

function load() {
  if (!fs.existsSync(FILE)) return {};
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return {}; }
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

function save(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
  const b = getBackup();
  if (b && typeof b.scheduleBackup === 'function') b.scheduleBackup();
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
    const data = load();
    const val = resolvePath(data, splitKey(key));
    return val === undefined ? null : val;
  },

  fetch(key) {
    return this.get(key);
  },

  set(key, value) {
    const data = load();
    setPath(data, splitKey(key), value);
    save(data);
    return value;
  },

  has(key) {
    return this.get(key) !== null;
  },

  delete(key) {
    const data = load();
    deletePath(data, splitKey(key));
    save(data);
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
  }
};

module.exports = db;

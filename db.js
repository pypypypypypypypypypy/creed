const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'db_data.json');

function ensureStore() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, '{}', 'utf8');
  }
}

function load() {
  ensureStore();
  try {
    const text = fs.readFileSync(DB_FILE, 'utf8');
    if (!text.trim()) return {};
    return JSON.parse(text) || {};
  } catch (e) {
    return {};
  }
}

function save(data) {
  ensureStore();
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function getFromObject(obj, key) {
  const parts = String(key).split('.');
  let cur = obj;
  for (const part of parts) {
    if (!cur || typeof cur !== 'object' || !(part in cur)) return undefined;
    cur = cur[part];
  }
  return cur;
}

function setInObject(obj, key, value) {
  const parts = String(key).split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!cur[part] || typeof cur[part] !== 'object') {
      cur[part] = {};
    }
    cur = cur[part];
  }
  cur[parts[parts.length - 1]] = value;
}

function delInObject(obj, key) {
  const parts = String(key).split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!cur || typeof cur !== 'object' || !(part in cur)) return;
    cur = cur[part];
  }
  delete cur[parts[parts.length - 1]];
}

function get(key, fallback) {
  const data = load();
  const value = getFromObject(data, key);
  return value === undefined ? fallback : value;
}

function set(key, value) {
  const data = load();
  setInObject(data, key, value);
  save(data);
  return value;
}

function del(key) {
  const data = load();
  delInObject(data, key);
  save(data);
}

function has(key) {
  return get(key, undefined) !== undefined;
}

function all() {
  return load();
}

function push(key, value) {
  const data = load();
  const existing = getFromObject(data, key);
  const arr = Array.isArray(existing) ? existing : [];
  arr.push(value);
  setInObject(data, key, arr);
  save(data);
  return arr;
}

function flushSync() {
  ensureStore();
  save(load());
}

module.exports = {
  get,
  set,
  delete: del,
  del,
  has,
  all,
  push,
  flushSync,
  load,
  save,
};

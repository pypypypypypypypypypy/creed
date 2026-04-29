const db = require('../db');

function getScope(guildId) {
  const mode = db.get(`economy.${guildId}.mode`) || 'guild';
  return mode === 'global' ? 'global' : guildId;
}

function isEnabled(guildId) {
  const val = db.get(`economy.${guildId}.enabled`);
  return val === null ? true : val;
}

function getCurrencyEmoji() {
  try {
    delete require.cache[require.resolve('../emojis.json')];
    const e = require('../emojis.json');
    return e.chip || '$';
  } catch {
    return '$';
  }
}

function fmt(amount) {
  const sym = getCurrencyEmoji();
  const num = Number(amount).toLocaleString();
  // If the symbol is a Discord custom emoji tag, separate it from the number
  // with a space so it renders cleanly. Otherwise (fallback `$`), keep flush.
  return sym.startsWith('<') ? `${sym} ${num}` : `${sym}${num}`;
}

function getWallet(guildId, userId) {
  const scope = getScope(guildId);
  return db.get(`economy.${scope}.wallet.${userId}`) || 0;
}

function setWallet(guildId, userId, amount) {
  const scope = getScope(guildId);
  db.set(`economy.${scope}.wallet.${userId}`, Math.max(0, Math.floor(amount)));
}

function getBank(guildId, userId) {
  const scope = getScope(guildId);
  return db.get(`economy.${scope}.bank.${userId}`) || 0;
}

function setBank(guildId, userId, amount) {
  const scope = getScope(guildId);
  db.set(`economy.${scope}.bank.${userId}`, Math.max(0, Math.floor(amount)));
}

function hasAccount(guildId, userId) {
  const scope = getScope(guildId);
  return db.has(`economy.${scope}.wallet.${userId}`);
}

function openAccount(guildId, userId) {
  const scope = getScope(guildId);
  if (!db.has(`economy.${scope}.wallet.${userId}`)) db.set(`economy.${scope}.wallet.${userId}`, 0);
  if (!db.has(`economy.${scope}.bank.${userId}`)) db.set(`economy.${scope}.bank.${userId}`, 0);
}

// Parses amounts like:
//   1000, 1,000, 1_000  -> 1000
//   5k, 2.5k            -> 5000, 2500
//   10m, 1.2m           -> 10000000, 1200000
//   3b, 4t              -> 3000000000, 4000000000000
//   all / half / max    -> wallet / wallet/2 / wallet
// Returns NaN for invalid input. `wallet` is optional for plain numeric
// callers that don't need the all/half shortcuts.
function parseAmount(str, wallet = 0) {
  if (str === null || str === undefined) return NaN;
  const raw = String(str).trim().toLowerCase().replace(/[, _]/g, '');
  if (!raw) return NaN;
  if (raw === 'all' || raw === 'max') return wallet;
  if (raw === 'half') return Math.floor(wallet / 2);

  const m = raw.match(/^(\d+(?:\.\d+)?)([kmbt])?$/);
  if (!m) return NaN;
  const base = parseFloat(m[1]);
  if (!isFinite(base)) return NaN;

  const mult = { k: 1e3, m: 1e6, b: 1e9, t: 1e12 }[m[2]] || 1;
  const n = Math.floor(base * mult);
  return isFinite(n) ? n : NaN;
}

function cooldownLeft(key, duration) {
  const last = db.get(key) || 0;
  const remaining = duration - (Date.now() - last);
  return remaining > 0 ? remaining : 0;
}

function formatMs(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

module.exports = { getScope, isEnabled, fmt, getWallet, setWallet, getBank, setBank, hasAccount, openAccount, parseAmount, cooldownLeft, formatMs };

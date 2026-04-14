const db = require('../db');

function getScope(guildId) {
  const mode = db.get(`economy.${guildId}.mode`) || 'guild';
  return mode === 'global' ? 'global' : guildId;
}

function isEnabled(guildId) {
  const val = db.get(`economy.${guildId}.enabled`);
  return val === null ? true : val;
}

function fmt(amount) {
  return `$${Number(amount).toLocaleString()}`;
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

function parseAmount(str, wallet) {
  if (!str) return NaN;
  const lower = str.toLowerCase();
  if (lower === 'all') return wallet;
  if (lower === 'half') return Math.floor(wallet / 2);
  const n = parseInt(str.replace(/,/g, ''), 10);
  return isNaN(n) ? NaN : n;
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

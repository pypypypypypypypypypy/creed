const fs = require('fs');
const path = require('path');

const OWNER_ID = '1525410659121107016';

const ownerIds = new Set([OWNER_ID]);

const AUTH_FILE = path.join(__dirname, '..', 'data', 'authorized.json');

function ensureDir() {
  const dir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Schema: { [userId]: ["cmdName1", "cmdName2", ...] }
function loadAuth() {
  try {
    const raw = fs.readFileSync(AUTH_FILE, 'utf8');
    const obj = JSON.parse(raw);
    return (obj && typeof obj === 'object') ? obj : {};
  } catch {
    return {};
  }
}

function saveAuth(obj) {
  ensureDir();
  fs.writeFileSync(AUTH_FILE, JSON.stringify(obj, null, 2));
}

function isOwner(userId) {
  return String(userId) === OWNER_ID;
}

function isAuthorizedFor(userId, cmdName) {
  if (!cmdName) return false;
  const auth = loadAuth();
  const list = auth[String(userId)];
  return Array.isArray(list) && list.includes(String(cmdName).toLowerCase());
}

// Single gate that every owner-only command should call.
function canRunOwnerCmd(userId, cmdName) {
  return isOwner(userId) || isAuthorizedFor(userId, cmdName);
}

function authorizeUser(userId, cmdName) {
  const auth = loadAuth();
  const uid = String(userId);
  const cmd = String(cmdName).toLowerCase();
  const list = Array.isArray(auth[uid]) ? auth[uid] : [];
  if (list.includes(cmd)) return false; // no change
  list.push(cmd);
  auth[uid] = list;
  saveAuth(auth);
  return true;
}

function revokeUser(userId, cmdName) {
  const auth = loadAuth();
  const uid = String(userId);
  const cmd = String(cmdName).toLowerCase();
  const list = Array.isArray(auth[uid]) ? auth[uid] : [];
  const next = list.filter((c) => c !== cmd);
  if (next.length === list.length) return false; // no change
  if (next.length === 0) delete auth[uid]; else auth[uid] = next;
  saveAuth(auth);
  return true;
}

function listAuthorizations() {
  return loadAuth();
}

module.exports = {
  isOwner,
  ownerIds,
  isAuthorizedFor,
  canRunOwnerCmd,
  authorizeUser,
  revokeUser,
  listAuthorizations,
};

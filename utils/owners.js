const OWNER_ID = '370268185410404353';

const ownerIds = new Set([OWNER_ID]);

function isOwner(userId) {
  return String(userId) === OWNER_ID;
}

module.exports = { isOwner, ownerIds };
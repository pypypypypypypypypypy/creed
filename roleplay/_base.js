const fetch = require('node-superfetch');

const FALLBACKS = {
  angrystare: 'stare',
  cool: 'smug',
  pinch: 'poke',
  love: 'hug',
  highfive: 'wave',
  kill: 'slap',
  shoot: 'kick',
};

async function getRpGif(action) {
  const endpoint = FALLBACKS[action] || action;
  try {
    const { body } = await fetch.get(`https://nekos.best/api/v2/${endpoint}`);
    return body?.results?.[0]?.url || null;
  } catch {
    return null;
  }
}

module.exports = { getRpGif };

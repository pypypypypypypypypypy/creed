const client = require('../index');
const db = require('../db');
const fs = require('fs');
const path = require('path');
const { scheduleEnd, endGiveaway } = require('../giveaway/giveaway');
const voice24 = require('../music/voice24');
const { refreshAvatarColor } = require('../utils/avatarColor');

const COMMAND_DIRS = [
  'configuration', 'economy', 'fun', 'information', 'lastfm', 'moderation',
  'security', 'utility', 'owner', 'giveaway', 'starboard', 'roleplay',
  'reactionrole', 'reaction', 'bumpreminder', 'sticker', 'stickymessage', 'emoji',
  'buttonrole', 'notify', 'timer', 'automod', 'message', 'music', 'info', 'leveling'
];

// Names we care about — must match what uploademojis uploads to the server.
// NOTE: vm_* and other emojis that are managed as Application Emojis on the bot
// are intentionally excluded so guild scans never overwrite emojis.json with
// stale per-guild copies.
const KNOWN_EMOJI_KEYS = {
  slot_cherry: 'slot_cherry', slot_lemon: 'slot_lemon', slot_orange: 'slot_orange',
  slot_grape: 'slot_grape', slot_star: 'slot_star', slot_diamond: 'slot_diamond',
  slot_watermelon: 'slot_watermelon', slot_bell: 'slot_bell', slot_seven: 'slot_seven',
  chip: 'chip',
};

const APPLICATION_EMOJI_ALIASES = {
  warning: ['warn'],
  fail: ['deny'],
  success: ['approve', 'verifiedBot', 'verifiedServer'],
  loading: ['slots'],
  bug_hunter: ['bugHunter'],
  bug_hunter_level_2: ['bugHunterPlus'],
  verified_bot_developer: ['verifiedBotDev'],
  hypesquad: ['hypeSquad'],
  hypesquad_balance: ['hypeSquadBal'],
  hypesquad_bravery: ['hypeSquadBravery'],
  hypesquad_brilliance: ['hypeSquadBril'],
  staff: ['discordStaff'],
  partner: ['discordPartner'],
  early_supporter: ['earlySupporter'],
  lock: ['vm_lock'],
  unlock: ['vm_unlock'],
  ghost: ['vm_ghost'],
  reveal: ['vm_reveal'],
  claim: ['vm_claim'],
  disconnect: ['vm_disconnect'],
  activity: ['vm_activity'],
  information: ['vm_info'],
  increase: ['vm_increase'],
  decrease: ['vm_decrease'],
};

function emojiTag(emoji) {
  return `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>`;
}

function reloadCommands() {
  client.commands.clear();
  client.aliases.clear();

  for (const dir of COMMAND_DIRS) {
    const dirPath = path.join(__dirname, '..', dir);
    let files;
    try {
      files = fs.readdirSync(dirPath).filter(file => file.endsWith('.js'));
    } catch {
      continue;
    }

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      try {
        delete require.cache[require.resolve(filePath)];
        const pull = require(filePath);
        if (pull.name) client.commands.set(pull.name, pull);
        if (pull.aliases && Array.isArray(pull.aliases)) {
          pull.aliases.forEach(alias => client.aliases.set(alias, pull.name));
        }
      } catch {}
    }
  }
}

async function loadApplicationEmojis() {
  const emojiPath = path.join(__dirname, '..', 'emojis.json');
  const current = JSON.parse(fs.readFileSync(emojiPath, 'utf8'));
  let updated = false;

  if (!global.botEmojis) global.botEmojis = {};

  try {
    await client.application.emojis.fetch();
  } catch {
    return 0;
  }

  for (const [, emoji] of client.application.emojis.cache) {
    const tag = emojiTag(emoji);
    const keys = [emoji.name, ...(APPLICATION_EMOJI_ALIASES[emoji.name] || [])];
    for (const key of keys) {
      if (current[key] !== tag) {
        current[key] = tag;
        updated = true;
      }
      global.botEmojis[key] = tag;
    }
  }

  if (updated) {
    fs.writeFileSync(emojiPath, JSON.stringify(current, null, 2));
    delete require.cache[require.resolve('../emojis.json')];
    reloadCommands();
    console.log(`Auto-synced ${client.application.emojis.cache.size} application emoji(s).`);
  }

  return client.application.emojis.cache.size;
}

async function loadGuildEmojis() {
  const emojiPath = path.join(__dirname, '..', 'emojis.json');
  const current = JSON.parse(fs.readFileSync(emojiPath, 'utf8'));
  let updated = false;

  if (!global.botEmojis) global.botEmojis = {};
  const applicationNames = new Set(client.application.emojis.cache.keys());

  for (const guild of client.guilds.cache.values()) {
    try {
      const emojis = await guild.emojis.fetch();
      for (const [, emoji] of emojis) {
        const key = KNOWN_EMOJI_KEYS[emoji.name];
        if (key && !applicationNames.has(emoji.name)) {
          const tag = emojiTag(emoji);
          if (current[key] !== tag) { current[key] = tag; updated = true; }
          global.botEmojis[key] = tag;
        }
      }
    } catch {}
  }

  if (updated) {
    fs.writeFileSync(emojiPath, JSON.stringify(current, null, 2));
    delete require.cache[require.resolve('../emojis.json')];
    reloadCommands();
    console.log('Auto-loaded guild emoji IDs into emojis.json');
  }

  return Object.keys(global.botEmojis).length;
}

client.on('clientReady', async () => {
  console.log(`${client.user.username} is now up and running!`);
  await refreshAvatarColor(client);

  // Sync application emojis first so commands use the bot's current custom emoji IDs.
  const applicationFound = await loadApplicationEmojis().catch(() => 0);
  if (applicationFound > 0) console.log(`Loaded ${applicationFound} application emoji(s).`);

  // Auto-discover server emojis so the bot works after redeploy.
  // Application emojis take precedence when names overlap.
  const found = await loadGuildEmojis().catch(() => 0);
  if (found > 0) console.log(`Loaded ${found} custom emojis from guild(s).`);

  // Restore active giveaway timers
  const data = db.get('__all_giveaway_ids') || [];
  let restored = 0;
  for (const messageId of data) {
    const g = db.get(`giveaway_${messageId}`);
    if (!g || g.ended || g.cancelled) continue;
    const remaining = g.endTime - Date.now();
    if (remaining <= 0) {
      await endGiveaway(client, messageId).catch(() => {});
    } else {
      scheduleEnd(client, messageId, remaining);
      restored++;
    }
  }
  console.log(`Restored ${restored} active giveaway timer(s).`);

  // Restore 24/7 voice sessions
  await voice24.restoreAll(client).catch(() => {});
});

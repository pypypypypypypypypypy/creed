const client = require('../bleed');
const db = require('../db');
const fs = require('fs');
const path = require('path');
const { scheduleEnd, endGiveaway } = require('../giveaway/giveaway');

const COMMAND_DIRS = [
  'configuration', 'economy', 'fun', 'information', 'lastfm', 'moderation',
  'security', 'utility', 'owner', 'giveaway', 'starboard', 'roleplay',
  'reactionrole', 'reaction', 'bumpreminder', 'sticker', 'stickymessage', 'emoji',
  'buttonrole', 'notify', 'timer', 'automod', 'message', 'music', 'info', 'leveling'
];

// Names we care about — must match what uploademojis uploads to the server
const KNOWN_EMOJI_KEYS = {
  add: 'add', approve: 'approve', warning: 'warn', deny: 'deny',
  remove: 'remove', cooldown: 'cooldown', replyline: 'replyline',
  vm_lock: 'vm_lock', vm_unlock: 'vm_unlock', vm_ghost: 'vm_ghost',
  vm_reveal: 'vm_reveal', vm_claim: 'vm_claim', vm_disconnect: 'vm_disconnect',
  vm_activity: 'vm_activity', vm_info: 'vm_info', vm_increase: 'vm_increase',
  vm_decrease: 'vm_decrease',
  slots: 'slots',
  slot_cherry: 'slot_cherry', slot_lemon: 'slot_lemon', slot_orange: 'slot_orange',
  slot_grape: 'slot_grape', slot_star: 'slot_star', slot_diamond: 'slot_diamond',
};

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

async function loadGuildEmojis() {
  const emojiPath = path.join(__dirname, '..', 'emojis.json');
  const current = JSON.parse(fs.readFileSync(emojiPath, 'utf8'));
  let updated = false;

  if (!global.botEmojis) global.botEmojis = {};

  for (const guild of client.guilds.cache.values()) {
    try {
      const emojis = await guild.emojis.fetch();
      for (const [, emoji] of emojis) {
        const key = KNOWN_EMOJI_KEYS[emoji.name];
        if (key) {
          const tag = `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>`;
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

  // Auto-discover server emojis so the bot works after redeploy
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
});

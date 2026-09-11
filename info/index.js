console.log(`[boot] bored-xd v1.0.0 (commit 4ee9afd) starting at ${new Date().toISOString()}`);
const { default_prefix, color } = require("./config.json");
const token = process.env.DISCORD_TOKEN || process.env.TOKEN;
const { Client, Collection, GatewayIntentBits, Partials } = require("discord.js");
const { installDynamicEmbedColors } = require('../utils/avatarColor');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.AutoModerationConfiguration,
    GatewayIntentBits.AutoModerationExecution,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
  allowedMentions: { parse: ['users', 'roles'], repliedUser: false },
});

installDynamicEmbedColors(client);

const jointocreate = require("./jointocreate");
jointocreate(client);

client.commands = new Collection();
client.aliases = new Collection();
client.db = require('./db');

module.exports = client;

["command", "event", "music", "slash"].forEach(handler => {
  require(`./handlers/${handler}`)(client);
});

// ---------- persistence: restore on boot, flush on shutdown ----------
const backup = require('./utils/backup');

(async () => {
  const r = await backup.restoreFromChannel();
  if (r.restored) {
    console.log(`[backup] restored ${r.size} bytes from snapshot dated ${r.ts}`);
  } else {
    console.log(`[backup] restore skipped: ${r.reason}`);
  }
  try {
    await client.login(token);
  } catch (e) {
    console.error('[bored] login failed:', e.message);
    process.exit(1);
  }
})();

let shuttingDown = false;
async function gracefulExit(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[backup] ${signal} received, flushing pending backup...`);
  try { require('./db').flushSync(); } catch {}
  try {
    await Promise.race([
      backup.flushPending(),
      new Promise((res) => setTimeout(res, backup.SHUTDOWN_TIMEOUT_MS)),
    ]);
  } catch (e) {
    console.error('[backup] flush failed:', e.message);
  }
  process.exit(0);
}
['SIGTERM', 'SIGINT'].forEach((s) => process.on(s, () => gracefulExit(s)));

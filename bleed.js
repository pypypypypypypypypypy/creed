const { default_prefix, color } = require("./config.json");
const token = process.env.DISCORD_TOKEN || process.env.TOKEN;
const { Client, Collection, GatewayIntentBits, Partials } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
  allowedMentions: { parse: ['users', 'roles'], repliedUser: false },
});

const jointocreate = require("./jointocreate");
jointocreate(client);

client.commands = new Collection();
client.aliases = new Collection();
client.db = require('./db');

module.exports = client;

["command", "event"].forEach(handler => {
  require(`./handlers/${handler}`)(client);
});

client.login(token);

const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');
const { color } = require('../config.json');

const RULES_IMAGE_PATH = path.join(__dirname, '..', 'assets', 'rules.png');

module.exports = {
  category: 'utility',
  help: [
    {
      name: 'rules',
      description: 'View server rules',
      aliases: 'rule, serverrules',
      parameters: 'n/a',
      information: 'n/a',
      usage: 'rules',
      example: 'rules',
    },
  ],

  name: 'rules',
  aliases: ['rule', 'serverrules'],

  run: async (client, message) => {
    const file = new AttachmentBuilder(RULES_IMAGE_PATH, { name: 'rules.png' });

    const topEmbed = new EmbedBuilder()
      .setColor(color)
      .setImage('attachment://rules.png');

    const rulesEmbed = new EmbedBuilder()
      .setColor(color)
      .setThumbnail('attachment://rules.png')
      .setDescription(
        `Thank you for your interest in **bored**. In order to keep our community in tact, and our users safe you **MUST** agree to abide by these rules:\n\n` +
        `- Joining to cause drama will only result in __punishment__. This server is not a place to bring issues.\n` +
        `- Attempting to spam commands or 'down' bored will only result in a __server__ **OR** __user__ blacklist **OR** global ban. We do not tolerate this behaviour.\n` +
        `- Do NOT spam mention our developers or support, we do this as a hobby and we have lives off Discord.\n` +
        `- Do not send gore, obscene sexual content or advertisements. This will result in bans or proper punishment.`,
      );

    await message.channel.send({ embeds: [topEmbed, rulesEmbed], files: [file] });
  },
};

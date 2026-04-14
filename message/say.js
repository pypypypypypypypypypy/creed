const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'message',
  help: [
    {
        name: 'say',
        description: 'Make the bot say something',
        aliases: 'n/a',
        parameters: '(text)',
        information: 'MANAGE_MESSAGES',
        usage: 'say (text)',
        example: 'say text'
    }
],

    name: 'say',

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_messages\``)] });
    }

    const text = args.join(' ');
    if (!text) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}say <text>\``)] });

    await message.delete().catch(() => {});
    message.channel.send(text);
  }
};

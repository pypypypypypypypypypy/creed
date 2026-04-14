const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'message',
  help: [
    {
        name: 'copy',
        description: 'Copy a message to another channel',
        aliases: 'n/a',
        parameters: '(message link) (channel)',
        information: 'MANAGE_MESSAGES',
        usage: 'copy (message link) (channel)',
        example: 'copy message link'
    }
],

    name: 'copy',

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!args[0]) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}copy <message id>\``)] });

    const msg = await message.channel.messages.fetch(args[0]).catch(() => null);
    if (!msg) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Message not found in this channel.`)] });

    const content = msg.content || (msg.embeds[0]?.description || 'No text content found.');
    await message.delete().catch(() => {});
    message.channel.send(content);
  }
};

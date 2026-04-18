const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'message',
  help: [
    {
        name: 'edit',
        description: 'Edit a bot message',
        aliases: 'n/a',
        parameters: '(message link) (new content)',
        information: 'MANAGE_MESSAGES',
        usage: 'edit (message link) (new content)',
        example: 'edit message link'
    }
],

    name: 'edit',

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_messages\``)] });
    }

    if (!args[0] || !args[1]) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}edit <message id> <new text>\``)] });

    const msg = await message.channel.messages.fetch(args[0]).catch(() => null);
    if (!msg) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Message not found.`)] });
    if (msg.author.id !== client.user.id) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I can only edit my own messages.`)] });

    const newText = args.slice(1).join(' ');
    await msg.edit(newText).catch(() => {});
    await message.delete().catch(() => {});
  }
};

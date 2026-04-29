const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');

module.exports = {
  category: 'moderation',
  help: [
    {
        name: 'nsfw',
        description: 'Mark a channel as NSFW (18+)',
        aliases: 'n/a',
        parameters: '[channel]',
        information: 'MANAGE_CHANNELS',
        usage: 'nsfw [channel]',
        example: 'nsfw'
    }
],

  name: 'nsfw',

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: You need **Manage Channels** permission.`)] });
    }

    const channel = message.mentions.channels.first() || message.channel;

    if (channel.nsfw) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: ${channel} is already marked as **NSFW**.`)] });
    }

    await channel.setNSFW(true, `Marked NSFW by ${message.author.tag}`);
    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: ${channel} has been marked as **NSFW** 🔞`)] });
  }
};

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');

module.exports = {
  category: 'moderation',
  help: [
    {
        name: 'sfw',
        description: 'Remove the NSFW mark from a channel',
        aliases: 'n/a',
        parameters: '[channel]',
        information: 'MANAGE_CHANNELS',
        usage: 'sfw [channel]',
        example: 'sfw'
    }
],

  name: 'sfw',

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: You need **Manage Channels** permission.`)] });
    }

    const channel = message.mentions.channels.first() || message.channel;

    if (!channel.nsfw) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: ${channel} is already **SFW**.`)] });
    }

    await channel.setNSFW(false, `Marked SFW by ${message.author.tag}`);
    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: ${channel} has been marked as **SFW** ✅`)] });
  }
};

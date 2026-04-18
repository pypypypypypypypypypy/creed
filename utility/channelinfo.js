const { EmbedBuilder, ChannelType } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'channelinfo',
        description: 'View information about a channel',
        aliases: 'ci',
        parameters: '[channel]',
        information: 'n/a',
        usage: 'channelinfo [channel]',
        example: 'channelinfo channel'
    }
],

    name: 'channelinfo',
  aliases: ['ci'],

  run: async (client, message, args) => {
    const channel = message.mentions.channels.first() || (args[0] ? message.guild.channels.cache.get(args[0]) : message.channel);
    if (!channel) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Channel not found.`)] });

    const typeNames = {
      [ChannelType.GuildText]: 'Text Channel',
      [ChannelType.GuildVoice]: 'Voice Channel',
      [ChannelType.GuildCategory]: 'Category',
      [ChannelType.GuildAnnouncement]: 'Announcement Channel',
      [ChannelType.GuildForum]: 'Forum Channel',
      [ChannelType.GuildStageVoice]: 'Stage Channel',
      [ChannelType.GuildThread]: 'Thread',
    };

    const createdAt = Math.floor(channel.createdTimestamp / 1000);
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`#${channel.name}`)
      .addFields(
        { name: 'ID', value: channel.id, inline: true },
        { name: 'Type', value: typeNames[channel.type] || 'Unknown', inline: true },
        { name: 'Created', value: `<t:${createdAt}:R>`, inline: true },
        { name: 'Category', value: channel.parent?.name || 'None', inline: true },
        { name: 'Position', value: `${channel.position}`, inline: true },
        { name: 'Topic', value: channel.topic || 'No topic set', inline: false }
      )
      .setFooter({ text: `Module: utility` })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};

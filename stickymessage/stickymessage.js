const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');

if (!global.stickyMessages) global.stickyMessages = {};
if (!global.stickyLastMsg) global.stickyLastMsg = {};

module.exports = {
  category: 'stickymessage',
  help: [
    {
        name: 'stickymessage',
        description: 'Manage sticky messages in channels',
        aliases: 'sticky',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'stickymessage',
        example: 'stickymessage'
    },
    {
        name: 'stickymessage set',
        description: 'Set a sticky message in a channel',
        aliases: 'n/a',
        parameters: '(channel) (message)',
        information: 'MANAGE_GUILD',
        usage: 'stickymessage set (channel) (message)',
        example: 'stickymessage set channel'
    },
    {
        name: 'stickymessage remove',
        description: 'Remove the sticky message from a channel',
        aliases: 'n/a',
        parameters: '(channel)',
        information: 'MANAGE_GUILD',
        usage: 'stickymessage remove (channel)',
        example: 'stickymessage remove channel'
    },
    {
        name: 'stickymessage list',
        description: 'List all sticky messages',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'stickymessage list',
        example: 'stickymessage list'
    }
],

    name: 'stickymessage',
  aliases: ['sticky'],

  run: async (client, message, args) => {
    const sub = args[0]?.toLowerCase();

    const helpEmbed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle('Command: stickymessage')
      .setDescription('Manage sticky messages for channels.')
      .addFields(
        { name: '**Subcommands**', value: 'add, view, remove, list', inline: false },
        { name: '**Usage**', value: '```stickymessage add <#channel> <content>\nstickymessage view <#channel>\nstickymessage remove <#channel>\nstickymessage list```' }
      )
      .setFooter({ text: 'Module: utility' })
      .setTimestamp()
      .setColor(color);

    if (!sub || !['add', 'set', 'view', 'remove', 'delete', 'del', 'list'].includes(sub)) {
      return message.channel.send({ embeds: [helpEmbed] });
    }

    const guildId = message.guild.id;

    if (sub === 'list') {
      const guildSticky = Object.entries(global.stickyMessages).filter(([k]) => k.startsWith(guildId + ':'));
      if (!guildSticky.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription('No sticky messages in this server.')] });
      const lines = guildSticky.map(([k, v]) => `<#${k.split(':')[1]}> — ${v.content.slice(0, 60)}...`);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Sticky Messages').setDescription(lines.join('\n')).setTimestamp()] });
    }

    const targetChannel = message.mentions.channels.first() || message.channel;
    const key = `${guildId}:${targetChannel.id}`;

    if (sub === 'view') {
      const sticky = global.stickyMessages[key];
      if (!sticky) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`No sticky message in <#${targetChannel.id}>.`)] });
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(`Sticky — #${targetChannel.name}`).setDescription(sticky.content).setTimestamp()] });
    }

    if (sub === 'add' || sub === 'set') {
      const content = args.slice(2).join(' ');
      if (!content) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Please provide the sticky message content.`)] });
      global.stickyMessages[key] = { content, channelId: targetChannel.id };
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('a3eb7b').setDescription(`${approve} ${message.author}: Sticky message added to <#${targetChannel.id}>.`)] });
    }

    if (['remove', 'delete', 'del'].includes(sub)) {
      if (!global.stickyMessages[key]) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: No sticky message in <#${targetChannel.id}>.`)] });
      delete global.stickyMessages[key];
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('a3eb7b').setDescription(`${approve} ${message.author}: Removed sticky message from <#${targetChannel.id}>.`)] });
    }
  },
};

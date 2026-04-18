const { EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'counter',
        description: 'Manage stat counter channels',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'counter',
        example: 'counter'
    },
    {
        name: 'counter add',
        description: 'Add a counter channel',
        aliases: 'n/a',
        parameters: '(type)',
        information: 'MANAGE_GUILD',
        usage: 'counter add (type)',
        example: 'counter add type'
    },
    {
        name: 'counter remove',
        description: 'Remove a counter channel',
        aliases: 'n/a',
        parameters: '(channel)',
        information: 'MANAGE_GUILD',
        usage: 'counter remove (channel)',
        example: 'counter remove channel'
    },
    {
        name: 'counter list',
        description: 'List all counter channels',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'counter list',
        example: 'counter list'
    }
],

    name: 'counter',
  aliases: ['counters'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_channels\``)] });

    const sub = args[0]?.toLowerCase();

    const types = {
      members: () => message.guild.memberCount,
      humans: () => message.guild.members.cache.filter(m => !m.user.bot).size,
      bots: () => message.guild.members.cache.filter(m => m.user.bot).size,
      roles: () => message.guild.roles.cache.size,
      channels: () => message.guild.channels.cache.size
    };

    if (!sub || sub === 'list') {
      const counters = db.get(`counters_${message.guild.id}`) || [];
      if (!counters.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`No counters set up. Use \`${prefix}counter add <type>\`\n\nTypes: \`${Object.keys(types).join('`, `')}\``)] });
      const lines = counters.map(c => `<#${c.channelId}> → \`${c.type}\``);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Counters').setDescription(lines.join('\n'))] });
    }

    if (sub === 'add') {
      const type = args[1]?.toLowerCase();
      if (!type || !types[type]) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Valid types: \`${Object.keys(types).join('`, `')}\``)] });

      const value = types[type]();
      const labels = { members: 'Members', humans: 'Humans', bots: 'Bots', roles: 'Roles', channels: 'Channels' };
      const channel = await message.guild.channels.create({
        name: `${labels[type]}: ${value}`,
        type: ChannelType.GuildVoice,
        permissionOverwrites: [{ id: message.guild.id, deny: [PermissionFlagsBits.Connect] }],
        reason: `Counter channel for ${type}`
      });

      const counters = db.get(`counters_${message.guild.id}`) || [];
      counters.push({ channelId: channel.id, type });
      db.set(`counters_${message.guild.id}`, counters);

      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Created counter channel ${channel} for \`${type}\`.`)] });
    }

    if (sub === 'remove') {
      const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
      if (!channel) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Mention a counter channel to remove.`)] });
      const counters = (db.get(`counters_${message.guild.id}`) || []).filter(c => c.channelId !== channel.id);
      db.set(`counters_${message.guild.id}`, counters);
      await channel.delete('Counter removed');
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Counter removed.`)] });
    }

    message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}counter [add <type>] [remove #channel] [list]\``)] });
  }
};

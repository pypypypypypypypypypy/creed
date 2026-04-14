const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { default_prefix, color } = require('../config.json');
const { warn, deny, approve } = require('../emojis.json');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'joinping',
        description: 'Manage the join ping system',
        aliases: 'jp',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'joinping',
        example: 'joinping'
    },
    {
        name: 'joinping set',
        description: 'Set the join ping channel and message',
        aliases: 'n/a',
        parameters: '(channel) (message)',
        information: 'MANAGE_GUILD',
        usage: 'joinping set (channel) (message)',
        example: 'joinping set channel'
    },
    {
        name: 'joinping remove',
        description: 'Remove the join ping',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'joinping remove',
        example: 'joinping remove'
    },
    {
        name: 'joinping config',
        description: 'View join ping config',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'joinping config',
        example: 'joinping config'
    }
],

    name: 'joinping',
  aliases: ['jp'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });

    const sub = (args[0] || '').toLowerCase();

    if (sub === 'set') {
      const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
      if (!channel)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Usage: \`${prefix}joinping set #channel\``)] });

      db.set(`joinping_${message.guild.id}`, { channel: channel.id, message: db.get(`joinping_${message.guild.id}`)?.message || '{user}' });
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Join pings will be sent to ${channel}`)] });
    }

    if (sub === 'remove' || sub === 'disable' || sub === 'off') {
      db.delete(`joinping_${message.guild.id}`);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Join pings have been **disabled**.`)] });
    }

    if (sub === 'message') {
      const msg = args.slice(1).join(' ');
      if (!msg)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Usage: \`${prefix}joinping message <text>\`\nVariables: \`{user}\`, \`{server}\`, \`{count}\``)] });

      const existing = db.get(`joinping_${message.guild.id}`) || {};
      existing.message = msg;
      db.set(`joinping_${message.guild.id}`, existing);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Join ping message updated.`)] });
    }

    if (sub === 'test') {
      const config = db.get(`joinping_${message.guild.id}`);
      if (!config || !config.channel)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('fe6464').setDescription(`${deny} ${message.author}: Join ping is not configured.`)] });

      const channel = message.guild.channels.cache.get(config.channel);
      if (!channel)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('fe6464').setDescription(`${deny} ${message.author}: Configured channel no longer exists.`)] });

      const text = (config.message || '{user}')
        .replace(/{user}/g, message.author.toString())
        .replace(/{server}/g, message.guild.name)
        .replace(/{count}/g, message.guild.memberCount);

      await channel.send(text);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Test join ping sent to ${channel}`)] });
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('Command: joinping')
      .setDescription('Ping new members when they join the server.')
      .addFields(
        { name: 'Usage', value: `\`\`\`\n${prefix}joinping set #channel\n${prefix}joinping remove\n${prefix}joinping message <text>\n${prefix}joinping test\n\`\`\``, inline: false }
      )
      .setFooter({ text: 'Module: utility' })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};

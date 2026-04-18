const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'goodbye',
        description: 'Manage the goodbye message system',
        aliases: 'farewell, leave',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'goodbye',
        example: 'goodbye'
    },
    {
        name: 'goodbye add',
        description: 'Set the goodbye channel and message',
        aliases: 'n/a',
        parameters: '(channel) (message)',
        information: 'MANAGE_GUILD',
        usage: 'goodbye add (channel) (message)',
        example: 'goodbye add channel'
    },
    {
        name: 'goodbye remove',
        description: 'Remove the goodbye message',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'goodbye remove',
        example: 'goodbye remove'
    },
    {
        name: 'goodbye test',
        description: 'Test the goodbye message',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'goodbye test',
        example: 'goodbye test'
    },
    {
        name: 'goodbye config',
        description: 'View goodbye config',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'goodbye config',
        example: 'goodbye config'
    }
],

    name: 'goodbye',
  aliases: ['farewell', 'leave'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });

    const sub = args[0]?.toLowerCase();

    if (!sub) {
      const channel = db.get(`goodbye_channel_${message.guild.id}`);
      const msg = db.get(`goodbye_message_${message.guild.id}`);
      const embed = new EmbedBuilder().setColor(color).setTitle('Goodbye Settings')
        .addFields(
          { name: 'Channel', value: channel ? `<#${channel}>` : 'Not set', inline: true },
          { name: 'Message', value: msg || 'Default', inline: true }
        )
        .setFooter({ text: `Variables: {user}, {user.tag}, {guild}, {membercount}` });
      return message.channel.send({ embeds: [embed] });
    }

    if (sub === 'channel') {
      const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
      if (!channel) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please mention a channel.`)] });
      db.set(`goodbye_channel_${message.guild.id}`, channel.id);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Goodbye channel set to ${channel}.`)] });
    }

    if (sub === 'message') {
      const msg = args.slice(1).join(' ');
      if (!msg) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Provide a message. Variables: \`{user}\`, \`{user.tag}\`, \`{guild}\`, \`{membercount}\``)] });
      db.set(`goodbye_message_${message.guild.id}`, msg);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Goodbye message updated.`)] });
    }

    if (sub === 'disable' || sub === 'off') {
      db.delete(`goodbye_channel_${message.guild.id}`);
      db.delete(`goodbye_message_${message.guild.id}`);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Goodbye messages disabled.`)] });
    }

    message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}goodbye [channel #ch | message <text> | disable]\``)] });
  }
};

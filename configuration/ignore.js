const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { default_prefix, color } = require('../config.json');
const { warn, approve } = require('../emojis.json');

module.exports = {
  name: 'ignore',
  aliases: [],
  category: 'configuration',
  help: [
    { name: 'ignore', description: 'Ignore a channel from commands', aliases: 'n/a', parameters: '(channel)', information: 'MANAGE_GUILD', usage: 'ignore (channel)', example: 'ignore #general' },
    { name: 'ignore list', description: 'List ignored channels', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'ignore list', example: 'ignore list' },
    { name: 'ignore clear', description: 'Clear all ignored channels', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'ignore clear', example: 'ignore clear' },
  ],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });

    const sub = (args[0] || '').toLowerCase();
    const guildId = message.guild.id;
    const key = `ignored_channels_${guildId}`;

    if (sub === 'list') {
      const ignored = db.get(key) || [];
      if (!ignored.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: No channels are ignored.`)] });
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Ignored Channels').setDescription(ignored.map(id => `<#${id}>`).join('\n'))] });
    }

    if (sub === 'clear') {
      db.set(key, []);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: All ignored channels cleared.`)] });
    }

    const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);
    if (!channel) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Mention a channel to ignore/unignore.`)] });

    const ignored = db.get(key) || [];
    if (ignored.includes(channel.id)) {
      db.set(key, ignored.filter(id => id !== channel.id));
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: ${channel} is no longer ignored.`)] });
    }
    ignored.push(channel.id);
    db.set(key, ignored);
    return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: ${channel} will now be ignored.`)] });
  }
};

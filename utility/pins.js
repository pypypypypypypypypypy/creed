const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { default_prefix } = require('../config.json');

module.exports = {
  name: 'pins',
  aliases: [],
  category: 'utility',
  help: [
    { name: 'pins', description: 'Manage pin archive system', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_MESSAGES', usage: 'pins', example: 'pins' },
    { name: 'pins channel', description: 'Set the pin archive channel', aliases: 'n/a', parameters: '(#channel)', information: 'MANAGE_GUILD', usage: 'pins channel (#channel)', example: 'pins channel #pin-archive' },
    { name: 'pins set', description: 'Set the pin threshold count', aliases: 'n/a', parameters: '(number)', information: 'MANAGE_GUILD', usage: 'pins set (number)', example: 'pins set 50' },
    { name: 'pins archive', description: 'Archive current pins to the archive channel', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_MESSAGES', usage: 'pins archive', example: 'pins archive' },
    { name: 'pins unpin', description: 'Unpin all messages in the current channel', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_MESSAGES', usage: 'pins unpin', example: 'pins unpin' },
    { name: 'pins config', description: 'View pin settings', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'pins config', example: 'pins config' },
    { name: 'pins reset', description: 'Reset pin settings', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'pins reset', example: 'pins reset' },
  ],

  run: async (client, message, args) => {
    const prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;
    const sub = (args[0] || '').toLowerCase();
    const gid = message.guild.id;

    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages) && !message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_messages\``)] });

    if (!sub || sub === 'config') {
      const ch = db.get(`pins_channel_${gid}`);
      const threshold = db.get(`pins_threshold_${gid}`) || 50;
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color)
        .setTitle('Pin Archive Settings')
        .addFields(
          { name: 'Archive Channel', value: ch ? `<#${ch}>` : 'Not set', inline: true },
          { name: 'Pin Threshold', value: `${threshold}`, inline: true },
        )
        .setTimestamp()
      ] });
    }

    if (sub === 'channel') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });
      const ch = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
      if (!ch) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please mention a channel.`)] });
      db.set(`pins_channel_${gid}`, ch.id);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Pin archive channel set to ${ch}.`)] });
    }

    if (sub === 'set') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });
      const num = parseInt(args[1]);
      if (isNaN(num) || num < 1) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please provide a valid number.`)] });
      db.set(`pins_threshold_${gid}`, num);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Pin threshold set to **${num}**.`)] });
    }

    if (sub === 'archive') {
      const archiveChannel = db.get(`pins_channel_${gid}`);
      if (!archiveChannel) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: No archive channel set. Use \`${prefix}pins channel #channel\`.`)] });
      const ch = message.guild.channels.cache.get(archiveChannel);
      if (!ch) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Archive channel not found.`)] });
      const pins = await message.channel.messages.fetchPinned().catch(() => null);
      if (!pins || !pins.size) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: No pinned messages in this channel.`)] });
      let count = 0;
      for (const [, pin] of pins) {
        const embed = new EmbedBuilder()
          .setColor(color)
          .setAuthor({ name: pin.author.tag, iconURL: pin.author.displayAvatarURL({ forceStatic: false }) })
          .setDescription(pin.content || '*No text content*')
          .addFields({ name: 'Source', value: `[Jump to message](${pin.url})`, inline: true })
          .setTimestamp(pin.createdAt);
        if (pin.attachments.first()) embed.setImage(pin.attachments.first().url);
        await ch.send({ embeds: [embed] }).catch(() => {});
        count++;
      }
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Archived **${count}** pinned messages to ${ch}.`)] });
    }

    if (sub === 'unpin') {
      const pins = await message.channel.messages.fetchPinned().catch(() => null);
      if (!pins || !pins.size) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: No pinned messages in this channel.`)] });
      let count = 0;
      for (const [, pin] of pins) {
        await pin.unpin().catch(() => {});
        count++;
      }
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Unpinned **${count}** messages.`)] });
    }

    if (sub === 'reset') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });
      db.delete(`pins_channel_${gid}`);
      db.delete(`pins_threshold_${gid}`);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Pin settings have been **reset**.`)] });
    }

    return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Unknown subcommand. Use \`${prefix}pins\` for help.`)] });
  }
};

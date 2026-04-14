const { EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../db');
const { default_prefix, color } = require('../config.json');
const { warn, deny, approve } = require('../emojis.json');

module.exports = {
  category: 'moderation',
  help: [
    {
        name: 'setup',
        description: 'Run the moderation setup wizard',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'setup',
        example: 'setup'
    }
],

    name: 'setup',
  aliases: ['setupmod'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`administrator\``)] });

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`manage_channels\``)] });

    const sub = (args[0] || '').toLowerCase();

    if (sub === 'jail') {
      let jailChannel = message.guild.channels.cache.find(c => c.name === 'jail');
      if (!jailChannel) {
        jailChannel = await message.guild.channels.create({
          name: 'jail',
          type: ChannelType.GuildText,
          permissionOverwrites: [
            { id: message.guild.id, deny: [PermissionFlagsBits.ViewChannel] }
          ]
        });
      }

      let jailRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === 'jailed');
      if (!jailRole) {
        jailRole = await message.guild.roles.create({ name: 'Jailed', permissions: [] });
      }

      await jailChannel.permissionOverwrites.edit(jailRole, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
      });

      for (const [, channel] of message.guild.channels.cache) {
        if (channel.id !== jailChannel.id && channel.manageable) {
          await channel.permissionOverwrites.edit(jailRole, {
            ViewChannel: false,
            SendMessages: false
          }).catch(() => {});
        }
      }

      db.set(`jail_role_${message.guild.id}`, jailRole.id);
      db.set(`jail_channel_${message.guild.id}`, jailChannel.id);

      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Jail system has been **set up** successfully.`)] });
    }

    if (sub === 'logs') {
      let logChannel = message.guild.channels.cache.find(c => c.name === 'jail-log' || c.name === 'mod-logs');
      if (!logChannel) {
        logChannel = await message.guild.channels.create({
          name: 'mod-logs',
          type: ChannelType.GuildText,
          permissionOverwrites: [
            { id: message.guild.id, deny: [PermissionFlagsBits.ViewChannel] }
          ]
        });
      }

      db.set(`modlog_channel_${message.guild.id}`, logChannel.id);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Mod logs channel set to ${logChannel}`)] });
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({ name: message.guild.name, iconURL: message.guild.iconURL({ forceStatic: false }) })
      .setTitle('Setup')
      .setDescription('Initialize moderation systems for your server.')
      .addFields(
        { name: 'Usage', value: `\`\`\`\n${prefix}setup jail - Set up the jail system\n${prefix}setup logs - Set up mod-logs channel\n\`\`\``, inline: false }
      )
      .setFooter({ text: 'Module: moderation' })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};

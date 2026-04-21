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
      aliases: 'setupmod',
      parameters: 'jail | logs | modlogs | voicemaster',
      information: 'ADMINISTRATOR',
      usage: 'setup <option>',
      example: 'setup modlogs'
    }
  ],

  name: 'setup',
  aliases: ['setupmod'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`administrator\``)] });

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`manage_channels\``)] });

    const sub = (args[0] || '').toLowerCase();

    // ─── setup jail ───────────────────────────────────────────────
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

    // ─── setup logs (legacy alias) ────────────────────────────────
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

    // ─── setup modlogs ────────────────────────────────────────────
    if (sub === 'modlogs') {
      let logChannel = message.guild.channels.cache.find(c => c.name === 'logs' || c.name === 'mod-logs');
      if (!logChannel) {
        logChannel = await message.guild.channels.create({
          name: 'logs',
          type: ChannelType.GuildText,
          topic: 'Moderation action log',
          permissionOverwrites: [
            { id: message.guild.id, deny: [PermissionFlagsBits.ViewChannel] }
          ]
        });
      }

      db.set(`modlog_channel_${message.guild.id}`, logChannel.id);
      // Reset case counter for clean start
      if (!db.get(`modlog_case_${message.guild.id}`)) {
        db.set(`modlog_case_${message.guild.id}`, 0);
      }

      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('#a3eb7b')
            .setDescription(`${approve} ${message.author}: Mod logs have been **set up**. All moderation actions will be logged in ${logChannel}.`)
        ]
      });
    }

    // ─── setup voicemaster ────────────────────────────────────────
    if (sub === 'voicemaster') {
      let category = message.guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === '🎙 Voice Channels');
      if (!category) {
        category = await message.guild.channels.create({
          name: '🎙 Voice Channels',
          type: ChannelType.GuildCategory
        });
      }

      let joinChannel = message.guild.channels.cache.find(c => c.name === '➕ Join to Create' && c.parentId === category.id);
      if (!joinChannel) {
        joinChannel = await message.guild.channels.create({
          name: '➕ Join to Create',
          type: ChannelType.GuildVoice,
          parent: category.id
        });
      }

      db.set(`vm_join_channel_${message.guild.id}`, joinChannel.id);

      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('#a3eb7b')
            .setDescription(
              `${approve} ${message.author}: **VoiceMaster** has been set up!\n` +
              `Join <#${joinChannel.id}> to automatically get your own voice channel.`
            )
        ]
      });
    }

    // ─── Help embed ───────────────────────────────────────────────
    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({ name: message.guild.name, iconURL: message.guild.iconURL({ forceStatic: false }) })
      .setTitle('Setup')
      .setDescription('Initialize moderation systems for your server.')
      .addFields({
        name: 'Usage',
        value: [
          '```',
          `${prefix}setup jail        - Set up the jail system`,
          `${prefix}setup modlogs     - Set up mod-log channel`,
          `${prefix}setup voicemaster - Set up VoiceMaster (temp VCs)`,
          '```'
        ].join('\n'),
        inline: false
      })
      .setFooter({ text: 'Module: moderation' })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};

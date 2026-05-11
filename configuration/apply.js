const { EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../db');
const { default_prefix, color } = require('../config.json');
const { approve, warn, deny } = require('../emojis.json');

module.exports = {
  name: 'apply',
  aliases: ['application', 'applymode'],
  category: 'configuration',
  help: [
    { name: 'apply', description: 'Manage the apply-to-join system', aliases: 'application, applymode', parameters: 'on | off | channel | invite | status', information: 'ADMINISTRATOR', usage: 'apply <option>', example: 'apply on' },
    { name: 'apply on', description: 'Enable apply-to-join mode — new joiners are kicked and sent the application link', aliases: 'n/a', parameters: 'n/a', information: 'ADMINISTRATOR', usage: 'apply on', example: 'apply on' },
    { name: 'apply off', description: 'Disable apply-to-join mode', aliases: 'n/a', parameters: 'n/a', information: 'ADMINISTRATOR', usage: 'apply off', example: 'apply off' },
    { name: 'apply channel', description: 'Set the channel where application notifications are posted', aliases: 'chan, c', parameters: '(#channel)', information: 'ADMINISTRATOR', usage: 'apply channel #applications', example: 'apply channel #applications' },
    { name: 'apply invite', description: 'Set the invite/form link sent to people who try to join', aliases: 'link', parameters: '(url)', information: 'ADMINISTRATOR', usage: 'apply invite https://...', example: 'apply invite https://discord.gg/apply' },
    { name: 'apply status', description: 'Show the current apply-to-join configuration', aliases: 'check, view', parameters: 'n/a', information: 'ADMINISTRATOR', usage: 'apply status', example: 'apply status' },
  ],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`administrator\``)] });
    }

    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;
    const sub = (args[0] || '').toLowerCase();

    // ─── apply on ────────────────────────────────────────────────
    if (sub === 'on' || sub === 'enable') {
      const inviteLink = db.get(`apply_invite_${message.guild.id}`);
      const applyChannel = db.get(`apply_channel_${message.guild.id}`);

      if (!inviteLink) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(
            `${warn} ${message.author}: Set an application invite link first:\n\`${prefix}apply invite <url>\`\n\nThis link is what gets DM'd to people who try to join.`
          )]
        });
      }

      if (!applyChannel) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(
            `${warn} ${message.author}: Set an applications channel first:\n\`${prefix}apply channel #channel\`\n\nThis is where join attempts are logged.`
          )]
        });
      }

      db.set(`apply_mode_${message.guild.id}`, true);

      return message.channel.send({
        embeds: [new EmbedBuilder()
          .setColor('#a3eb7b')
          .setDescription(`${approve} ${message.author}: **Apply-to-join** is now **enabled**.\n\nAnyone who joins will be kicked and sent your application link in their DMs.`)
          .addFields(
            { name: 'Application Link', value: inviteLink, inline: true },
            { name: 'Log Channel', value: `<#${applyChannel}>`, inline: true }
          )
        ]
      });
    }

    // ─── apply off ───────────────────────────────────────────────
    if (sub === 'off' || sub === 'disable') {
      db.set(`apply_mode_${message.guild.id}`, false);
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: **Apply-to-join** is now **disabled**. Members can join freely again.`)]
      });
    }

    // ─── apply channel ───────────────────────────────────────────
    if (['channel', 'chan', 'c'].includes(sub)) {
      const channel = message.mentions.channels.first();
      if (!channel) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please mention a channel — \`${prefix}apply channel #channel\``)]
        });
      }
      db.set(`apply_channel_${message.guild.id}`, channel.id);
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Application log channel set to ${channel}`)]
      });
    }

    // ─── apply invite ────────────────────────────────────────────
    if (['invite', 'link', 'url'].includes(sub)) {
      const link = args[1];
      if (!link) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please provide a link — \`${prefix}apply invite <url>\``)]
        });
      }
      db.set(`apply_invite_${message.guild.id}`, link);
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Application invite link set to:\n${link}`)]
      });
    }

    // ─── apply status ────────────────────────────────────────────
    if (['status', 'check', 'view', 'info'].includes(sub)) {
      const enabled = db.get(`apply_mode_${message.guild.id}`);
      const inviteLink = db.get(`apply_invite_${message.guild.id}`);
      const applyChannel = db.get(`apply_channel_${message.guild.id}`);

      return message.channel.send({
        embeds: [new EmbedBuilder()
          .setColor(color)
          .setTitle('Apply-to-Join Status')
          .setAuthor({ name: message.guild.name, iconURL: message.guild.iconURL({ forceStatic: false }) })
          .addFields(
            { name: 'Mode', value: enabled ? `${approve} **Enabled**` : `${deny} **Disabled**`, inline: true },
            { name: 'Log Channel', value: applyChannel ? `<#${applyChannel}>` : 'Not set', inline: true },
            { name: 'Application Link', value: inviteLink || 'Not set', inline: false }
          )
          .setFooter({ text: `Module: configuration` })
          .setTimestamp()
        ]
      });
    }

    // ─── help embed ──────────────────────────────────────────────
    return message.channel.send({
      embeds: [new EmbedBuilder()
        .setColor(color)
        .setAuthor({ name: message.guild.name, iconURL: message.guild.iconURL({ forceStatic: false }) })
        .setTitle('Apply-to-Join')
        .setDescription('Force members to apply before joining your server.')
        .addFields({
          name: 'Usage',
          value: [
            '```',
            `${prefix}apply on                    - Enable apply mode`,
            `${prefix}apply off                   - Disable apply mode`,
            `${prefix}apply channel #channel      - Set the log channel`,
            `${prefix}apply invite <url>          - Set the application link`,
            `${prefix}apply status                - View current config`,
            '```'
          ].join('\n'),
          inline: false
        })
        .setFooter({ text: 'Module: configuration' })
        .setTimestamp()
      ]
    });
  }
};

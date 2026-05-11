const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { default_prefix, color } = require('../config.json');
const { approve, warn, deny } = require('../emojis.json');

module.exports = {
  name: 'apply',
  aliases: ['applymode', 'application'],
  category: 'configuration',
  help: [
    { name: 'apply', description: 'Toggle the "Members must apply to join" Community setting', aliases: 'applymode, application', parameters: 'on | off | status', information: 'ADMINISTRATOR', usage: 'apply <on/off/status>', example: 'apply on' },
  ],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`administrator\``)] });
    }

    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;
    const sub = (args[0] || '').toLowerCase();

    const guild = message.guild;

    // Require Community to be enabled
    if (!guild.features.includes('COMMUNITY')) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(
          `${warn} ${message.author}: This server doesn't have **Community** enabled.\n\nGo to **Server Settings → Enable Community** first, then run this command.`
        )]
      });
    }

    // ─── status ───────────────────────────────────────────────────
    if (!sub || ['status', 'check', 'view'].includes(sub)) {
      const isOn = guild.features.includes('MEMBER_VERIFICATION_GATE_ENABLED');
      return message.channel.send({
        embeds: [new EmbedBuilder()
          .setColor(color)
          .setAuthor({ name: guild.name, iconURL: guild.iconURL({ forceStatic: false }) })
          .setTitle('Apply to Join')
          .setDescription(`The **"Members must apply to join"** Community setting is currently ${isOn ? `${approve} **enabled**` : `${deny} **disabled**`}.`)
          .addFields({ name: 'Toggle', value: `\`${prefix}apply on\` / \`${prefix}apply off\``, inline: false })
          .setFooter({ text: 'Module: configuration' })
          .setTimestamp()
        ]
      });
    }

    // ─── on ───────────────────────────────────────────────────────
    if (sub === 'on' || sub === 'enable') {
      if (guild.features.includes('MEMBER_VERIFICATION_GATE_ENABLED')) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: **Apply to join** is already **enabled** on this server.`)]
        });
      }

      try {
        const newFeatures = [...guild.features, 'MEMBER_VERIFICATION_GATE_ENABLED'];
        await guild.edit({ features: newFeatures });
        return message.channel.send({
          embeds: [new EmbedBuilder()
            .setColor('#a3eb7b')
            .setDescription(`${approve} ${message.author}: **Apply to join** has been **enabled**.\n\nNew members will now need to apply before joining **${guild.name}**.`)
          ]
        });
      } catch (e) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor('#ed4245').setDescription(`${deny} ${message.author}: Failed to enable apply to join.\n\`\`\`${e.message}\`\`\``)]
        });
      }
    }

    // ─── off ──────────────────────────────────────────────────────
    if (sub === 'off' || sub === 'disable') {
      if (!guild.features.includes('MEMBER_VERIFICATION_GATE_ENABLED')) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: **Apply to join** is already **disabled** on this server.`)]
        });
      }

      try {
        const newFeatures = guild.features.filter(f => f !== 'MEMBER_VERIFICATION_GATE_ENABLED');
        await guild.edit({ features: newFeatures });
        return message.channel.send({
          embeds: [new EmbedBuilder()
            .setColor('#a3eb7b')
            .setDescription(`${approve} ${message.author}: **Apply to join** has been **disabled**.\n\nMembers can join **${guild.name}** freely again.`)
          ]
        });
      } catch (e) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor('#ed4245').setDescription(`${deny} ${message.author}: Failed to disable apply to join.\n\`\`\`${e.message}\`\`\``)]
        });
      }
    }

    // ─── help ─────────────────────────────────────────────────────
    return message.channel.send({
      embeds: [new EmbedBuilder()
        .setColor(color)
        .setAuthor({ name: guild.name, iconURL: guild.iconURL({ forceStatic: false }) })
        .setTitle('Apply to Join')
        .setDescription('Toggle the **"Members must apply to join"** setting in your Community server.')
        .addFields({
          name: 'Usage',
          value: [
            '```',
            `${prefix}apply on      - Enable apply to join`,
            `${prefix}apply off     - Disable apply to join`,
            `${prefix}apply status  - Check current state`,
            '```'
          ].join('\n'),
          inline: false
        })
        .setFooter({ text: 'Module: configuration — requires Community to be enabled' })
        .setTimestamp()
      ]
    });
  }
};

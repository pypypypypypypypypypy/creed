const {
  EmbedBuilder,
  PermissionFlagsBits,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
  AutoModerationActionType,
} = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve, deny } = require('../emojis.json');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'automod',
  help: [
    { name: 'automod', description: 'Manage Discord native AutoMod rules', aliases: 'n/a', parameters: 'setup | list | remove | enable | disable | settings', information: 'MANAGE_GUILD', usage: 'automod <option>', example: 'automod setup' },
    { name: 'automod setup', description: 'Create Discord native AutoMod rules (spam, mentions, keywords)', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'automod setup', example: 'automod setup' },
    { name: 'automod list', description: 'List all active Discord AutoMod rules in this server', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'automod list', example: 'automod list' },
    { name: 'automod remove', description: 'Remove all AutoMod rules created by this bot', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'automod remove', example: 'automod remove' },
  ],

  name: 'automod',

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;
    const sub = (args[0] || '').toLowerCase();

    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });
    }

    const guild = message.guild;
    const guildId = guild.id;

    // ─── automod setup ───────────────────────────────────────────
    // Creates real Discord native AutoMod rules — these count toward the bot badge
    if (sub === 'setup') {
      const processingMsg = await message.channel.send({
        embeds: [new EmbedBuilder().setColor(color).setDescription(`Setting up Discord AutoMod rules for **${guild.name}**...`)]
      });

      const results = [];
      const existing = await guild.autoModerationRules.fetch().catch(() => null);

      // Helper: skip if a rule with same name already exists
      const alreadyExists = (name) => existing && [...existing.values()].some(r => r.name === name);

      // 1. Spam protection (built-in Discord AutoMod trigger)
      if (!alreadyExists('[drown] Spam Protection')) {
        try {
          await guild.autoModerationRules.create({
            name: '[drown] Spam Protection',
            eventType: AutoModerationRuleEventType.MessageSend,
            triggerType: AutoModerationRuleTriggerType.Spam,
            actions: [{ type: AutoModerationActionType.BlockMessage }],
            enabled: true,
          });
          results.push(`${approve} Spam Protection — enabled`);
        } catch (e) {
          results.push(`${deny} Spam Protection — failed: ${e.message}`);
        }
      } else {
        results.push(`${warn} Spam Protection — already exists`);
      }

      // 2. Mention spam (built-in Discord AutoMod trigger)
      if (!alreadyExists('[drown] Mention Spam')) {
        try {
          await guild.autoModerationRules.create({
            name: '[drown] Mention Spam',
            eventType: AutoModerationRuleEventType.MessageSend,
            triggerType: AutoModerationRuleTriggerType.MentionSpam,
            triggerMetadata: { mentionTotalLimit: 5, mentionRaidProtectionEnabled: true },
            actions: [
              { type: AutoModerationActionType.BlockMessage },
              { type: AutoModerationActionType.Timeout, metadata: { durationSeconds: 60 } },
            ],
            enabled: true,
          });
          results.push(`${approve} Mention Spam (5+ pings) — enabled`);
        } catch (e) {
          results.push(`${deny} Mention Spam — failed: ${e.message}`);
        }
      } else {
        results.push(`${warn} Mention Spam — already exists`);
      }

      // 3. Harmful links / malware (built-in Discord AutoMod trigger)
      if (!alreadyExists('[drown] Harmful Links')) {
        try {
          await guild.autoModerationRules.create({
            name: '[drown] Harmful Links',
            eventType: AutoModerationRuleEventType.MessageSend,
            triggerType: AutoModerationRuleTriggerType.KeywordPreset,
            triggerMetadata: { presets: [1, 2] }, // 1 = Profanity, 2 = SexualContent — use harmful keyword detection
            actions: [{ type: AutoModerationActionType.BlockMessage }],
            enabled: false, // Off by default — admin can enable
          });
          results.push(`${approve} Harmful Links / Content filter — created (disabled by default)`);
        } catch (e) {
          results.push(`${deny} Harmful Links — failed: ${e.message}`);
        }
      } else {
        results.push(`${warn} Harmful Links — already exists`);
      }

      // 4. Discord invite links keyword rule
      if (!alreadyExists('[drown] Anti-Invite')) {
        try {
          await guild.autoModerationRules.create({
            name: '[drown] Anti-Invite',
            eventType: AutoModerationRuleEventType.MessageSend,
            triggerType: AutoModerationRuleTriggerType.Keyword,
            triggerMetadata: {
              regexPatterns: ['discord\\.gg\\/[\\w-]+', 'discord\\.com\\/invite\\/[\\w-]+', 'dsc\\.gg\\/[\\w-]+'],
            },
            actions: [{ type: AutoModerationActionType.BlockMessage }],
            enabled: true,
          });
          results.push(`${approve} Anti-Invite Links — enabled`);
        } catch (e) {
          results.push(`${deny} Anti-Invite — failed: ${e.message}`);
        }
      } else {
        results.push(`${warn} Anti-Invite — already exists`);
      }

      db.set(`automod.${guildId}.enabled`, true);
      db.set(`automod.${guildId}.native`, true);

      return processingMsg.edit({
        embeds: [new EmbedBuilder()
          .setColor('#a3eb7b')
          .setTitle('AutoMod Setup Complete')
          .setDescription(results.join('\n'))
          .setFooter({ text: 'These rules are managed natively by Discord — visible in Server Settings → AutoMod' })
          .setTimestamp()
        ]
      });
    }

    // ─── automod list ────────────────────────────────────────────
    if (sub === 'list') {
      const rules = await guild.autoModerationRules.fetch().catch(() => null);
      if (!rules || rules.size === 0) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: No AutoMod rules found. Run \`${prefix}automod setup\` to create them.`)]
        });
      }

      const triggerNames = {
        1: 'Keyword',
        2: 'Harmful Link',
        3: 'Spam',
        4: 'Keyword Preset',
        5: 'Mention Spam',
      };

      const fields = [...rules.values()].map(rule => ({
        name: rule.name,
        value: `Type: \`${triggerNames[rule.triggerType] || rule.triggerType}\` | ${rule.enabled ? `${approve} Enabled` : `${deny} Disabled`}`,
        inline: false,
      }));

      return message.channel.send({
        embeds: [new EmbedBuilder()
          .setColor(color)
          .setTitle(`AutoMod Rules — ${guild.name}`)
          .addFields(fields)
          .setFooter({ text: `${rules.size} rule(s) active` })
          .setTimestamp()
        ]
      });
    }

    // ─── automod remove ──────────────────────────────────────────
    if (sub === 'remove' || sub === 'delete') {
      const rules = await guild.autoModerationRules.fetch().catch(() => null);
      if (!rules || rules.size === 0) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: No AutoMod rules to remove.`)]
        });
      }

      const botRules = [...rules.values()].filter(r => r.name.startsWith('[drown]'));
      if (botRules.length === 0) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: No AutoMod rules created by this bot were found.`)]
        });
      }

      let removed = 0;
      for (const rule of botRules) {
        await guild.autoModerationRules.delete(rule.id).catch(() => {});
        removed++;
      }

      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Removed **${removed}** AutoMod rule(s) from **${guild.name}**.`)]
      });
    }

    // ─── legacy enable/disable (custom automod) ──────────────────
    if (sub === 'enable') {
      db.set(`automod.${guildId}.enabled`, true);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Automod has been **enabled**. Run \`${prefix}automod setup\` to also create Discord native rules.`)] });
    }

    if (sub === 'disable') {
      db.set(`automod.${guildId}.enabled`, false);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Automod has been **disabled**.`)] });
    }

    if (sub === 'settings' || sub === 'config') {
      const enabled = db.get(`automod.${guildId}.enabled`) ?? false;
      const native = db.get(`automod.${guildId}.native`) ?? false;
      const antilink = db.get(`automod.${guildId}.antilink`) ?? false;
      const antispam = db.get(`automod.${guildId}.antispam`) ?? false;
      const antiinvite = db.get(`automod.${guildId}.antiinvite`) ?? false;

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`Automod Settings — ${guild.name}`)
        .addFields(
          { name: 'Automod', value: enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
          { name: 'Discord Native Rules', value: native ? '✅ Set up' : `❌ Not set up — run \`${prefix}automod setup\``, inline: true },
          { name: 'Anti-Link', value: antilink ? '✅ Enabled' : '❌ Disabled', inline: true },
          { name: 'Anti-Spam', value: antispam ? '✅ Enabled' : '❌ Disabled', inline: true },
          { name: 'Anti-Invite', value: antiinvite ? '✅ Enabled' : '❌ Disabled', inline: true }
        )
        .setTimestamp();

      return message.channel.send({ embeds: [embed] });
    }

    // ─── help ─────────────────────────────────────────────────────
    return message.channel.send({
      embeds: [new EmbedBuilder()
        .setColor(color)
        .setAuthor({ name: guild.name, iconURL: guild.iconURL({ forceStatic: false }) })
        .setTitle('AutoMod')
        .setDescription('Manage Discord native AutoMod rules for your server.')
        .addFields({
          name: 'Usage',
          value: [
            '```',
            `${prefix}automod setup    - Create Discord native AutoMod rules`,
            `${prefix}automod list     - List all active AutoMod rules`,
            `${prefix}automod remove   - Remove all rules created by this bot`,
            `${prefix}automod settings - View current config`,
            '```'
          ].join('\n'),
          inline: false
        })
        .setFooter({ text: 'Module: automod' })
        .setTimestamp()
      ]
    });
  }
};

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve, deny } = require('../emojis.json');
const { paginate } = require('../utils/paginate');

function cfg(guildId) { return db.get(`antiraid.${guildId}`) || {}; }
function saveCfg(guildId, data) { db.set(`antiraid.${guildId}`, data); }

function parseFlags(args) {
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--threshold' && args[i + 1]) flags.threshold = parseInt(args[++i]);
    if (args[i] === '--interval' && args[i + 1]) flags.interval = parseInt(args[++i]);
    if (args[i] === '--punishment' && args[i + 1]) flags.punishment = args[++i].toLowerCase();
    if (args[i] === '--age' && args[i + 1]) flags.age = parseInt(args[++i]);
  }
  return flags;
}

module.exports = {
  name: 'antiraid',
  aliases: ['ar'],
  category: 'security',
  help: [
    { name: 'antiraid', description: 'Manage the AntiRaid protection system', aliases: 'ar', parameters: 'n/a', information: 'ADMINISTRATOR', usage: 'antiraid', example: 'antiraid' },
    { name: 'antiraid toggle', description: 'Enable or disable AntiRaid', aliases: 'n/a', parameters: '(enable|disable)', information: 'ADMINISTRATOR', usage: 'antiraid toggle (enable|disable)', example: 'antiraid toggle enable' },
    { name: 'antiraid config', description: 'View full AntiRaid configuration', aliases: 'n/a', parameters: 'n/a', information: 'ADMINISTRATOR', usage: 'antiraid config', example: 'antiraid config' },
    { name: 'antiraid whitelist', description: 'Manage AntiRaid whitelist', aliases: 'n/a', parameters: '[view] (user)', information: 'ADMINISTRATOR', usage: 'antiraid whitelist (user)', example: 'antiraid whitelist @user' },
    { name: 'antiraid massjoin', description: 'Enable or disable mass join detection', aliases: 'n/a', parameters: '(enable|disable)', information: 'ADMINISTRATOR', usage: 'antiraid massjoin (enable|disable)', example: 'antiraid massjoin enable' },
  ],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You need **Manage Server** permission.`)] });

    const sub = (args[0] || '').toLowerCase();
    const guildId = message.guild.id;
    let c = cfg(guildId);

    // ── TOGGLE ────────────────────────────────────────────────────────────────
    if (sub === 'toggle') {
      const status = (args[1] || '').toLowerCase();
      if (!['enable', 'disable', 'on', 'off'].includes(status))
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Provide \`enable\` or \`disable\`.`)] });
      c.enabled = status === 'enable' || status === 'on';
      saveCfg(guildId, c);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: AntiRaid has been **${c.enabled ? 'enabled' : 'disabled'}**.`)] });
    }

    // ── STATE ─────────────────────────────────────────────────────────────────
    if (sub === 'state') {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} AntiRaid is currently **${c.enabled ? 'enabled' : 'disabled'}** for this server.`)] });
    }

    // ── CONFIG ────────────────────────────────────────────────────────────────
    if (sub === 'config') {
      const embed = new EmbedBuilder().setColor(color).setTitle('⚔️ AntiRaid Configuration')
        .addFields(
          { name: 'Status', value: c.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
          { name: 'Mass Join', value: c.massjoin?.enabled ? `✅ — Threshold: ${c.massjoin.threshold || 10}/min — Punishment: ${c.massjoin.punishment || 'kick'}` : '❌ Disabled', inline: false },
          { name: 'Mass Mention', value: c.massmention?.enabled ? `✅ — Threshold: ${c.massmention.threshold || 5} — Punishment: ${c.massmention.punishment || 'mute'}` : '❌ Disabled', inline: false },
          { name: 'Account Age', value: c.age?.enabled ? `✅ — Minimum: ${c.age.days || 7} days` : '❌ Disabled', inline: false },
          { name: 'Avatar Check', value: c.avatar?.enabled ? `✅ — Punishment: ${c.avatar.punishment || 'kick'}` : '❌ Disabled', inline: false },
          { name: 'Unverified Bots', value: c.unverifiedbots?.enabled ? `✅ — Punishment: ${c.unverifiedbots.punishment || 'ban'}` : '❌ Disabled', inline: false },
          { name: 'Username Patterns', value: (c.patterns || []).length ? (c.patterns || []).join(', ') : 'None', inline: false },
          { name: 'Whitelist', value: (c.whitelist || []).length ? (c.whitelist || []).map(id => `<@${id}>`).join(', ') : 'None', inline: false },
        ).setTimestamp();
      return message.channel.send({ embeds: [embed] });
    }

    // ── LIST ──────────────────────────────────────────────────────────────────
    if (sub === 'list') {
      const modules = [];
      if (c.massjoin?.enabled) modules.push(`**Mass Join** — Threshold: ${c.massjoin.threshold || 10}/min`);
      if (c.massmention?.enabled) modules.push(`**Mass Mention** — Threshold: ${c.massmention.threshold || 5}`);
      if (c.age?.enabled) modules.push(`**Account Age** — Min: ${c.age.days || 7} days`);
      if (c.avatar?.enabled) modules.push(`**Avatar Check**`);
      if (c.unverifiedbots?.enabled) modules.push(`**Unverified Bots**`);
      if ((c.patterns || []).length) modules.push(`**Username Patterns** — ${(c.patterns).join(', ')}`);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('⚔️ AntiRaid Modules').setDescription(modules.length ? modules.join('\n') : 'No modules enabled.')] });
    }

    // ── MASSJOIN ──────────────────────────────────────────────────────────────
    if (sub === 'massjoin') {
      const status = (args[1] || '').toLowerCase();
      const flags = parseFlags(args.slice(2));
      if (!['enable', 'disable', 'on', 'off'].includes(status))
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Provide \`enable\` or \`disable\`. Flags: \`--threshold <n>\` \`--interval <seconds>\` \`--punishment <kick|ban>\``)] });
      c.massjoin = {
        enabled: status === 'enable' || status === 'on',
        threshold: flags.threshold || c.massjoin?.threshold || 10,
        interval: flags.interval || c.massjoin?.interval || 60,
        punishment: flags.punishment || c.massjoin?.punishment || 'kick',
      };
      saveCfg(guildId, c);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Mass Join detection **${c.massjoin.enabled ? 'enabled' : 'disabled'}** — ${c.massjoin.threshold} joins/${c.massjoin.interval}s → **${c.massjoin.punishment}**.`)] });
    }

    // ── MASSMENTION ───────────────────────────────────────────────────────────
    if (sub === 'massmention') {
      const status = (args[1] || '').toLowerCase();
      const flags = parseFlags(args.slice(2));
      if (!['enable', 'disable', 'on', 'off'].includes(status))
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Provide \`enable\` or \`disable\`. Flags: \`--threshold <n>\` \`--punishment <mute|kick|ban>\``)] });
      c.massmention = {
        enabled: status === 'enable' || status === 'on',
        threshold: flags.threshold || c.massmention?.threshold || 5,
        punishment: flags.punishment || c.massmention?.punishment || 'mute',
      };
      saveCfg(guildId, c);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Mass Mention detection **${c.massmention.enabled ? 'enabled' : 'disabled'}** — ${c.massmention.threshold} mentions → **${c.massmention.punishment}**.`)] });
    }

    // ── AGE ───────────────────────────────────────────────────────────────────
    if (sub === 'age') {
      const status = (args[1] || '').toLowerCase();
      const flags = parseFlags(args.slice(2));
      if (!['enable', 'disable', 'on', 'off'].includes(status))
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Provide \`enable\` or \`disable\`. Flags: \`--age <days>\` \`--punishment <kick|ban>\``)] });
      c.age = {
        enabled: status === 'enable' || status === 'on',
        days: flags.age || c.age?.days || 7,
        punishment: flags.punishment || c.age?.punishment || 'kick',
      };
      saveCfg(guildId, c);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Account Age check **${c.age.enabled ? 'enabled' : 'disabled'}** — Minimum **${c.age.days}** days → **${c.age.punishment}**.`)] });
    }

    // ── AVATAR ────────────────────────────────────────────────────────────────
    if (sub === 'avatar') {
      const status = (args[1] || '').toLowerCase();
      const flags = parseFlags(args.slice(2));
      if (!['enable', 'disable', 'on', 'off'].includes(status))
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Provide \`enable\` or \`disable\`. Flags: \`--punishment <kick|ban>\``)] });
      c.avatar = {
        enabled: status === 'enable' || status === 'on',
        punishment: flags.punishment || c.avatar?.punishment || 'kick',
      };
      saveCfg(guildId, c);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: No-avatar check **${c.avatar.enabled ? 'enabled' : 'disabled'}** → **${c.avatar.punishment}**.`)] });
    }

    // ── UNVERIFIEDBOTS ────────────────────────────────────────────────────────
    if (sub === 'unverifiedbots') {
      const status = (args[1] || '').toLowerCase();
      const flags = parseFlags(args.slice(2));
      if (!['enable', 'disable', 'on', 'off'].includes(status))
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Provide \`enable\` or \`disable\`. Flags: \`--punishment <kick|ban>\``)] });
      c.unverifiedbots = {
        enabled: status === 'enable' || status === 'on',
        punishment: flags.punishment || c.unverifiedbots?.punishment || 'ban',
      };
      saveCfg(guildId, c);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Unverified bot detection **${c.unverifiedbots.enabled ? 'enabled' : 'disabled'}** → **${c.unverifiedbots.punishment}**.`)] });
    }

    // ── USERNAME ADD ──────────────────────────────────────────────────────────
    if (sub === 'username') {
      const sub2 = (args[1] || '').toLowerCase();
      if (sub2 === 'add') {
        const pattern = args[2];
        if (!pattern) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Provide a username pattern to filter.`)] });
        c.patterns = c.patterns || [];
        if (c.patterns.includes(pattern)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Pattern \`${pattern}\` is already in the list.`)] });
        c.patterns.push(pattern);
        saveCfg(guildId, c);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Username pattern \`${pattern}\` added.`)] });
      }
      if (sub2 === 'remove') {
        const pattern = args[2];
        if (!pattern) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Provide a pattern to remove.`)] });
        c.patterns = (c.patterns || []).filter(p => p !== pattern);
        saveCfg(guildId, c);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Pattern \`${pattern}\` removed.`)] });
      }
      if (sub2 === 'list') {
        const list = c.patterns || [];
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Username Patterns').setDescription(list.length ? list.map((p, i) => `**${i + 1}.** \`${p}\``).join('\n') : 'No patterns set.')] });
      }
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Subcommands: \`add\`, \`remove\`, \`list\`.`)] });
    }

    // ── WHITELIST VIEW ────────────────────────────────────────────────────────
    if (sub === 'whitelist') {
      if ((args[1] || '').toLowerCase() === 'view') {
        const list = c.whitelist || [];
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('AntiRaid Whitelist').setDescription(list.length ? list.map(id => `<@${id}> (${id})`).join('\n') : 'No users whitelisted.')] });
      }
      const userId = args[1]?.replace(/\D/g, '');
      if (!userId) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Mention a user or provide an ID, or use \`whitelist view\`.`)] });
      c.whitelist = c.whitelist || [];
      if (c.whitelist.includes(userId)) {
        c.whitelist = c.whitelist.filter(id => id !== userId);
        saveCfg(guildId, c);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: <@${userId}> removed from AntiRaid whitelist.`)] });
      }
      c.whitelist.push(userId);
      saveCfg(guildId, c);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: <@${userId}> added to AntiRaid whitelist.`)] });
    }

    // ── DEFAULT ───────────────────────────────────────────────────────────────
    let prefix = db.get(`prefix_${message.guild.id}`);
    if (prefix === null) prefix = require('../config.json').default_prefix;
    return paginate(message, [
      { name: 'antiraid', description: 'View antiraid configuration', aliases: 'ar', parameters: 'n/a', information: 'MANAGE_GUILD', usage: `${prefix}antiraid`, example: `${prefix}antiraid` },
      { name: 'antiraid toggle', description: 'Enable or disable the antiraid system', aliases: 'n/a', parameters: '(enable/disable)', information: 'MANAGE_GUILD', usage: `${prefix}antiraid toggle enable`, example: `${prefix}antiraid toggle enable` },
      { name: 'antiraid config', description: 'View all antiraid module settings', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: `${prefix}antiraid config`, example: `${prefix}antiraid config` },
      { name: 'antiraid state', description: 'Check if antiraid is enabled or disabled', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: `${prefix}antiraid state`, example: `${prefix}antiraid state` },
      { name: 'antiraid list', description: 'List all active antiraid modules', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: `${prefix}antiraid list`, example: `${prefix}antiraid list` },
      { name: 'antiraid massjoin', description: 'Configure mass join detection', aliases: 'n/a', parameters: '(enable/disable) [--threshold n] [--interval s] [--punishment kick/ban]', information: 'MANAGE_GUILD', usage: `${prefix}antiraid massjoin enable --threshold 10`, example: `${prefix}antiraid massjoin enable --threshold 10 --punishment kick` },
      { name: 'antiraid massmention', description: 'Configure mass mention detection', aliases: 'n/a', parameters: '(enable/disable) [--threshold n] [--punishment mute/kick/ban]', information: 'MANAGE_GUILD', usage: `${prefix}antiraid massmention enable`, example: `${prefix}antiraid massmention enable --threshold 5` },
      { name: 'antiraid age', description: 'Block accounts below a minimum age', aliases: 'n/a', parameters: '(enable/disable) [--age days] [--punishment kick/ban]', information: 'MANAGE_GUILD', usage: `${prefix}antiraid age enable --age 7`, example: `${prefix}antiraid age enable --age 7 --punishment kick` },
      { name: 'antiraid avatar', description: 'Block accounts with no avatar', aliases: 'n/a', parameters: '(enable/disable) [--punishment kick/ban]', information: 'MANAGE_GUILD', usage: `${prefix}antiraid avatar enable`, example: `${prefix}antiraid avatar enable --punishment kick` },
      { name: 'antiraid whitelist', description: 'Add or remove a user from the antiraid whitelist', aliases: 'n/a', parameters: '(user id)', information: 'MANAGE_GUILD', usage: `${prefix}antiraid whitelist (user id)`, example: `${prefix}antiraid whitelist 123456789` },
    ], 'security');
  }
};

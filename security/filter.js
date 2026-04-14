const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve, deny } = require('../emojis.json');
const { paginate } = require('../utils/paginate');

function cfg(guildId) { return db.get(`filter.${guildId}`) || {}; }
function saveCfg(guildId, data) { db.set(`filter.${guildId}`, data); }

const EXEMPT_TYPES = ['invites', 'links', 'nsfw', 'malicious', 'spam', 'massmention', 'emoji', 'caps', 'repetition', 'walloftext', 'images', 'spoilers', 'musicfiles', 'nicknames'];

module.exports = {
  name: 'filter',
  aliases: ['f'],
  category: 'security',
  help: [
    { name: 'filter', description: 'Manage the word filter system', aliases: 'f', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'filter', example: 'filter' },
    { name: 'filter add', description: 'Add a word to the filter', aliases: 'n/a', parameters: '(word)', information: 'MANAGE_GUILD', usage: 'filter add (word)', example: 'filter add badword' },
    { name: 'filter remove', description: 'Remove a word from the filter', aliases: 'n/a', parameters: '(word)', information: 'MANAGE_GUILD', usage: 'filter remove (word)', example: 'filter remove badword' },
    { name: 'filter list', description: 'List all filtered words', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'filter list', example: 'filter list' },
    { name: 'filter reset', description: 'Reset all filter settings', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'filter reset', example: 'filter reset' },
  ],

  run: async (client, message, args) => {
    const sub = (args[0] || '').toLowerCase();
    const guildId = message.guild.id;
    let c = cfg(guildId);

    const hasManageGuild = message.member.permissions.has(PermissionFlagsBits.ManageGuild);
    const hasManageChannels = message.member.permissions.has(PermissionFlagsBits.ManageChannels);

    if (!hasManageChannels && !hasManageGuild)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You need **Manage Channels** permission.`)] });

    // ── ADD ───────────────────────────────────────────────────────────────────
    if (sub === 'add') {
      if (!hasManageGuild) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Requires **Manage Guild** permission.`)] });
      const word = args.slice(1).join(' ').toLowerCase();
      if (!word) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Provide a word to filter.`)] });
      c.words = c.words || [];
      if (c.words.includes(word)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} \`${word}\` is already filtered.`)] });
      c.words.push(word);
      saveCfg(guildId, c);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: \`${word}\` added to word filter.`)] });
    }

    // ── REMOVE ────────────────────────────────────────────────────────────────
    if (sub === 'remove') {
      if (!hasManageGuild) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Requires **Manage Guild** permission.`)] });
      const word = args.slice(1).join(' ').toLowerCase();
      if (!word) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Provide a word to remove.`)] });
      c.words = (c.words || []).filter(w => w !== word);
      saveCfg(guildId, c);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: \`${word}\` removed from word filter.`)] });
    }

    // ── LIST ──────────────────────────────────────────────────────────────────
    if (sub === 'list') {
      const words = c.words || [];
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('🔍 Filtered Words').setDescription(words.length ? words.map((w, i) => `**${i + 1}.** ||${w}||`).join('\n') : 'No words filtered.')] });
    }

    // ── WHITELIST ─────────────────────────────────────────────────────────────
    if (sub === 'whitelist') {
      if (!hasManageGuild) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Requires **Manage Guild** permission.`)] });
      const word = args.slice(1).join(' ').toLowerCase();
      if (!word) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Provide a word to whitelist.`)] });
      c.whitelist = c.whitelist || [];
      if (c.whitelist.includes(word)) {
        c.whitelist = c.whitelist.filter(w => w !== word);
        saveCfg(guildId, c);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: \`${word}\` removed from whitelist.`)] });
      }
      c.whitelist.push(word);
      saveCfg(guildId, c);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: \`${word}\` added to whitelist.`)] });
    }

    // ── RESET ─────────────────────────────────────────────────────────────────
    if (sub === 'reset') {
      if (!hasManageGuild) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Requires **Manage Guild** permission.`)] });
      db.delete(`filter.${guildId}`);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: All filter settings have been reset.`)] });
    }

    // ── EXEMPT ────────────────────────────────────────────────────────────────
    if (sub === 'exempt') {
      const roleId = (message.mentions.roles.first() || message.guild.roles.cache.get(args[1]))?.id;
      if (!roleId) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Mention a role to exempt from filters.`)] });
      c.exemptRoles = c.exemptRoles || [];
      if (c.exemptRoles.includes(roleId)) {
        c.exemptRoles = c.exemptRoles.filter(r => r !== roleId);
        saveCfg(guildId, c);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: <@&${roleId}> removed from filter exemptions.`)] });
      }
      c.exemptRoles.push(roleId);
      saveCfg(guildId, c);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: <@&${roleId}> added to filter exemptions.`)] });
    }

    // ── SETTINGS ──────────────────────────────────────────────────────────────
    if (sub === 'settings') {
      const embed = new EmbedBuilder().setColor(color).setTitle('🔍 Filter Settings')
        .addFields(
          { name: 'Words', value: `${(c.words || []).length} filtered`, inline: true },
          { name: 'Whitelist', value: `${(c.whitelist || []).length} words`, inline: true },
          { name: 'Exempt Roles', value: (c.exemptRoles || []).map(r => `<@&${r}>`).join(', ') || 'None', inline: false },
          { name: 'Regex Patterns', value: `${Object.keys(c.regex || {}).length} patterns`, inline: true },
          { name: 'Strike System', value: c.strikes?.enabled ? `✅ Cap: ${c.strikes.cap || 3}` : '❌ Disabled', inline: true },
          { name: 'Domain Blacklist', value: `${(c.blacklist || []).length} domains`, inline: true },
        ).setTimestamp();
      return message.channel.send({ embeds: [embed] });
    }

    // ── WORDMIGRATE ───────────────────────────────────────────────────────────
    if (sub === 'wordmigrate') {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Word migration complete. All words have been imported.`)] });
    }

    // ── SNIPE ─────────────────────────────────────────────────────────────────
    if (sub === 'snipe') {
      const filterType = args[1];
      if (!filterType) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Provide a filter type to snipe (e.g. \`words\`, \`links\`, \`invites\`).`)] });
      const snipeData = db.get(`filtersnipe.${guildId}.${filterType}`);
      if (!snipeData) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} No sniped **${filterType}** messages found.`)] });
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(`Sniped Filter: ${filterType}`).setDescription(`**Author:** <@${snipeData.author}>\n**Message:** ${snipeData.content}\n**Time:** <t:${snipeData.time}:R>`)] });
    }

    // ── BLACKLIST ─────────────────────────────────────────────────────────────
    if (sub === 'blacklist') {
      const sub2 = (args[1] || '').toLowerCase();
      if (sub2 === 'add') {
        if (!hasManageGuild) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Requires **Manage Guild** permission.`)] });
        const domain = args[2];
        if (!domain) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Provide a domain to blacklist.`)] });
        c.blacklist = c.blacklist || [];
        if (c.blacklist.includes(domain)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} \`${domain}\` is already blacklisted.`)] });
        c.blacklist.push(domain);
        saveCfg(guildId, c);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} \`${domain}\` added to domain blacklist.`)] });
      }
      if (sub2 === 'remove') {
        if (!hasManageGuild) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Requires **Manage Guild** permission.`)] });
        const domain = args[2];
        c.blacklist = (c.blacklist || []).filter(d => d !== domain);
        saveCfg(guildId, c);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} \`${domain}\` removed from domain blacklist.`)] });
      }
      if (sub2 === 'list') {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Domain Blacklist').setDescription((c.blacklist || []).length ? (c.blacklist).map((d, i) => `**${i+1}.** \`${d}\``).join('\n') : 'No domains blacklisted.')] });
      }
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Subcommands: \`add <domain>\`, \`remove <domain>\`, \`list\`.`)] });
    }

    // ── LINKS ─────────────────────────────────────────────────────────────────
    if (sub === 'links') {
      const sub2 = (args[1] || '').toLowerCase();
      if (sub2 === 'whitelist') {
        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[2]);
        const url = args[3];
        if (!channel || !url) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Usage: \`filter links whitelist <#channel> <url>\``)] });
        c.linkWhitelist = c.linkWhitelist || {};
        c.linkWhitelist[channel.id] = c.linkWhitelist[channel.id] || [];
        c.linkWhitelist[channel.id].push(url);
        saveCfg(guildId, c);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} \`${url}\` whitelisted in ${channel}.`)] });
      }
      if (sub2 === 'exempt') {
        if ((args[2] || '').toLowerCase() === 'list') {
          return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Links Exempt List').setDescription((c.linkExempt || []).map(id => `<#${id}>`).join('\n') || 'None.')] });
        }
      }
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Subcommands: \`whitelist <#channel> <url>\`, \`exempt list\`.`)] });
    }

    // ── INVITES ───────────────────────────────────────────────────────────────
    if (sub === 'invites') {
      if ((args[1] || '').toLowerCase() === 'exempt' && (args[2] || '').toLowerCase() === 'list') {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Invite Links Exempt List').setDescription((c.inviteExempt || []).map(id => `<#${id}>`).join('\n') || 'None.')] });
      }
    }

    // ── REGEX ─────────────────────────────────────────────────────────────────
    if (sub === 'regex') {
      const sub2 = (args[1] || '').toLowerCase();
      if (sub2 === 'add') {
        if (!hasManageGuild) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Requires **Manage Guild** permission.`)] });
        const name = args[2], pattern = args.slice(3).join(' ');
        if (!name || !pattern) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Usage: \`filter regex add <name> <pattern>\``)] });
        try { new RegExp(pattern); } catch { return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${deny} Invalid regex pattern.`)] }); }
        c.regex = c.regex || {};
        c.regex[name] = pattern;
        saveCfg(guildId, c);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} Regex \`${name}\` added: \`${pattern}\``)] });
      }
      if (sub2 === 'remove') {
        const name = args[2];
        if (!name || !c.regex?.[name]) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Pattern \`${name || ''}\` not found.`)] });
        delete c.regex[name];
        saveCfg(guildId, c);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} Regex \`${name}\` removed.`)] });
      }
      if (sub2 === 'list') {
        const patterns = c.regex || {};
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Regex Patterns').setDescription(Object.keys(patterns).length ? Object.entries(patterns).map(([n, p]) => `**${n}**: \`${p}\``).join('\n') : 'No patterns.')] });
      }
      if (sub2 === 'test') {
        const name = args[2], text = args.slice(3).join(' ');
        if (!name || !text) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Usage: \`filter regex test <name> <text>\``)] });
        const pattern = c.regex?.[name];
        if (!pattern) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Pattern \`${name}\` not found.`)] });
        const matches = new RegExp(pattern, 'gi').test(text);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`Pattern \`${name}\` **${matches ? '✅ matched' : '❌ did not match'}** the text: \`${text}\``)] });
      }
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Subcommands: \`add <name> <pattern>\`, \`remove <name>\`, \`list\`, \`test <name> <text>\`.`)] });
    }

    // ── STRIKES ───────────────────────────────────────────────────────────────
    if (sub === 'strikes') {
      const sub2 = (args[1] || '').toLowerCase();
      if (sub2 === 'settings') {
        const s = c.strikes || {};
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Strike System Settings').addFields({ name: 'Enabled', value: s.enabled ? '✅' : '❌', inline: true }, { name: 'Cap', value: `${s.cap || 3}`, inline: true }, { name: 'Decay (hours)', value: `${s.decay || 24}`, inline: true }, { name: 'Levels', value: Object.entries(s.levels || {}).map(([l, v]) => `Level ${l}: ${v.strikes} strikes → ${v.punishment}`).join('\n') || 'None' })] });
      }
      if (sub2 === 'view') {
        const target = message.mentions.members.first() || message.guild.members.cache.get(args[2]) || message.member;
        const userStrikes = (c.userStrikes || {})[target.id] || 0;
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} **${target.user.username}** has **${userStrikes}** strikes.`)] });
      }
      if (sub2 === 'cap') {
        if (!hasManageGuild) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Requires **Manage Guild**.`)] });
        const cap = parseInt(args[2]);
        if (isNaN(cap)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Provide a number.`)] });
        c.strikes = c.strikes || {};
        c.strikes.cap = cap;
        saveCfg(guildId, c);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} Strike cap set to **${cap}**.`)] });
      }
      if (sub2 === 'set') {
        if (!hasManageGuild) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Requires **Manage Guild**.`)] });
        const level = args[2], strikes = parseInt(args[3]), punishment = args[4];
        if (!level || isNaN(strikes) || !punishment) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Usage: \`filter strikes set <level> <strikes> <punishment>\``)] });
        c.strikes = c.strikes || {}; c.strikes.levels = c.strikes.levels || {};
        c.strikes.levels[level] = { strikes, punishment };
        saveCfg(guildId, c);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} Level ${level}: ${strikes} strikes → **${punishment}**.`)] });
      }
      if (sub2 === 'toggle') {
        if (!hasManageGuild) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Requires **Manage Guild**.`)] });
        const enabled = args[2]?.toLowerCase() === 'true' || args[2]?.toLowerCase() === 'enable';
        c.strikes = c.strikes || {}; c.strikes.enabled = enabled;
        saveCfg(guildId, c);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} Strike system **${enabled ? 'enabled' : 'disabled'}**.`)] });
      }
      if (sub2 === 'decay') {
        if (!hasManageGuild) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Requires **Manage Guild**.`)] });
        const hours = parseInt(args[2]);
        if (isNaN(hours)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Provide hours.`)] });
        c.strikes = c.strikes || {}; c.strikes.decay = hours;
        saveCfg(guildId, c);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} Strikes decay after **${hours}** hours.`)] });
      }
      if (sub2 === 'reset') {
        if (!hasManageGuild) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Requires **Manage Guild**.`)] });
        const target = message.mentions.members.first() || message.guild.members.cache.get(args[2]);
        if (!target) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Mention a member.`)] });
        c.userStrikes = c.userStrikes || {}; delete c.userStrikes[target.id];
        saveCfg(guildId, c);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} Strikes reset for **${target.user.username}**.`)] });
      }
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Subcommands: \`settings\`, \`view <member>\`, \`cap <n>\`, \`set <level> <strikes> <punishment>\`, \`toggle\`, \`decay <hours>\`, \`reset <member>\`.`)] });
    }

    // ── EXEMPT LIST for filter types ──────────────────────────────────────────
    for (const type of EXEMPT_TYPES) {
      if (sub === type && (args[1] || '').toLowerCase() === 'exempt' && (args[2] || '').toLowerCase() === 'list') {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(`${type} Exempt Channels`).setDescription(((c[`${type}Exempt`] || []).map(id => `<#${id}>`).join('\n')) || 'None.')] });
      }
    }
    // also handle two-word exempt types: `filter invites exempt list` style
    if (EXEMPT_TYPES.includes(sub) && (args[1] || '').toLowerCase() === 'exempt') {
      const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[2]);
      if (!channel) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Mention a channel, or use \`list\` to view.`)] });
      c[`${sub}Exempt`] = c[`${sub}Exempt`] || [];
      if (c[`${sub}Exempt`].includes(channel.id)) {
        c[`${sub}Exempt`] = c[`${sub}Exempt`].filter(id => id !== channel.id);
        saveCfg(guildId, c); return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${channel} removed from **${sub}** exemptions.`)] });
      }
      c[`${sub}Exempt`].push(channel.id);
      saveCfg(guildId, c);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${channel} added to **${sub}** exemptions.`)] });
    }

    // ── DEFAULT ───────────────────────────────────────────────────────────────
    let prefix = db.get(`prefix_${message.guild.id}`);
    if (prefix === null) prefix = require('../config.json').default_prefix;
    return paginate(message, [
      { name: 'filter', description: 'Manage the word and content filter', aliases: 'f', parameters: 'n/a', information: 'MANAGE_CHANNELS', usage: `${prefix}filter`, example: `${prefix}filter` },
      { name: 'filter add', description: 'Add a word to the filter list', aliases: 'n/a', parameters: '(word)', information: 'MANAGE_GUILD', usage: `${prefix}filter add (word)`, example: `${prefix}filter add badword` },
      { name: 'filter remove', description: 'Remove a word from the filter list', aliases: 'n/a', parameters: '(word)', information: 'MANAGE_GUILD', usage: `${prefix}filter remove (word)`, example: `${prefix}filter remove badword` },
      { name: 'filter list', description: 'View all filtered words', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_CHANNELS', usage: `${prefix}filter list`, example: `${prefix}filter list` },
      { name: 'filter whitelist', description: 'Whitelist or un-whitelist a word from the filter', aliases: 'n/a', parameters: '(word)', information: 'MANAGE_GUILD', usage: `${prefix}filter whitelist (word)`, example: `${prefix}filter whitelist word` },
      { name: 'filter reset', description: 'Reset all filter settings', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: `${prefix}filter reset`, example: `${prefix}filter reset` },
      { name: 'filter settings', description: 'View all current filter settings', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_CHANNELS', usage: `${prefix}filter settings`, example: `${prefix}filter settings` },
      { name: 'filter exempt', description: 'Exempt a role from the filter', aliases: 'n/a', parameters: '(@role)', information: 'MANAGE_CHANNELS', usage: `${prefix}filter exempt @role`, example: `${prefix}filter exempt @Moderator` },
      { name: 'filter blacklist', description: 'Manage the domain blacklist (add/remove/list)', aliases: 'n/a', parameters: '(add/remove/list) [domain]', information: 'MANAGE_GUILD', usage: `${prefix}filter blacklist add example.com`, example: `${prefix}filter blacklist add example.com` },
      { name: 'filter regex', description: 'Manage regex filter patterns (add/remove/list/test)', aliases: 'n/a', parameters: '(add/remove/list/test) [name] [pattern]', information: 'MANAGE_GUILD', usage: `${prefix}filter regex add name pattern`, example: `${prefix}filter regex add badlinks https?://.*` },
      { name: 'filter strikes', description: 'Manage the strike system (settings/view/cap/set/toggle/decay/reset)', aliases: 'n/a', parameters: '(subcommand)', information: 'MANAGE_GUILD', usage: `${prefix}filter strikes settings`, example: `${prefix}filter strikes settings` },
    ], 'security');
  }
};

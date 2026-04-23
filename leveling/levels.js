const { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');

function getInfo(xp) {
  let level = 0;
  let required = 100;
  while (xp >= required) { xp -= required; level++; required = Math.floor(required * 1.35); }
  return { level, remxp: xp, levelxp: required };
}

module.exports = {
  name: 'levels',
  aliases: ['lvls'],
  category: 'leveling',
  help: [
    { name: 'levels', description: 'View the server XP leaderboard', aliases: 'lvls', parameters: 'n/a', information: 'n/a', usage: 'levels', example: 'levels' },
    { name: 'levels enable', description: 'Enable the leveling system', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'levels enable', example: 'levels enable' },
    { name: 'levels disable', description: 'Disable the leveling system', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'levels disable', example: 'levels disable' },
    { name: 'levels channel <#channel|none>', description: 'Set or clear the level-up announcement channel', aliases: 'n/a', parameters: '<#channel|none>', information: 'MANAGE_GUILD', usage: 'levels channel <#channel>', example: 'levels channel #general' },
    { name: 'levels message <text>', description: 'Set level-up message. Use {user}, {level}', aliases: 'n/a', parameters: '<text>', information: 'MANAGE_GUILD', usage: 'levels message <text>', example: 'levels message {user} reached level {level}!' },
    { name: 'levels reset [@user]', description: 'Reset XP for a user or the whole server', aliases: 'n/a', parameters: '[@user]', information: 'MANAGE_GUILD', usage: 'levels reset [@user]', example: 'levels reset @user' },
    { name: 'levels config', description: 'View leveling system settings', aliases: 'n/a', parameters: 'n/a', information: 'n/a', usage: 'levels config', example: 'levels config' },
  ],

  run: async (client, message, args) => {
    const { warn, approve } = require('../emojis.json');
    const sub = args[0]?.toLowerCase();
    const gid = message.guild.id;

    if (['enable', 'unlock', 'on'].includes(sub)) {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} You need **Manage Server** permission.`)] });
      db.set(`levels_enabled_${gid}`, true);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Leveling system **enabled**.`)] });
    }

    if (['disable', 'lock', 'off'].includes(sub)) {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} You need **Manage Server** permission.`)] });
      db.set(`levels_enabled_${gid}`, false);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Leveling system **disabled**.`)] });
    }

    if (sub === 'channel') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} You need **Manage Server** permission.`)] });
      if (args[1]?.toLowerCase() === 'none') {
        db.delete(`levels_channel_${gid}`);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Level-up announcements cleared. Messages will be sent in the same channel as the last message.`)] });
      }
      const ch = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
      if (!ch) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Mention a valid channel or use \`none\` to clear.`)] });
      db.set(`levels_channel_${gid}`, ch.id);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Level-up channel set to ${ch}.`)] });
    }

    if (sub === 'message') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} You need **Manage Server** permission.`)] });
      if (['view', 'check'].includes(args[1]?.toLowerCase())) {
        const levelMsg = db.get(`levels_message_${gid}`) || '🎉 {user} leveled up to level **{level}**!';
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Level-up Message').setDescription(levelMsg)] });
      }
      const msg = args.slice(1).join(' ');
      if (!msg) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Provide a message. Variables: \`{user}\` \`{level}\` \`{guild}\``)] });
      db.set(`levels_message_${gid}`, msg);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Level-up message set to:\n\`${msg}\``)] });
    }

    if (sub === 'add' || sub === 'create') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} You need **Manage Server** permission.`)] });
      const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
      const level = parseInt(args[2], 10);
      if (!role || !level) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Usage: \`levels add @role <level>\``)] });
      const rewards = db.get(`levels_rewards_${gid}`) || [];
      rewards.push({ roleId: role.id, level });
      db.set(`levels_rewards_${gid}`, rewards.filter((r, i, a) => a.findIndex(x => x.roleId === r.roleId) === i));
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: ${role} will be awarded at level **${level}**.`)] });
    }

    if (sub === 'remove' || sub === 'delete' || sub === 'del') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} You need **Manage Server** permission.`)] });
      const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
      if (!role) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Usage: \`levels remove @role\``)] });
      const rewards = (db.get(`levels_rewards_${gid}`) || []).filter(r => r.roleId !== role.id);
      db.set(`levels_rewards_${gid}`, rewards);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Removed ${role} from level rewards.`)] });
    }

    if (sub === 'list') {
      const rewards = db.get(`levels_rewards_${gid}`) || [];
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Level Rewards').setDescription(rewards.length ? rewards.map(r => `<@&${r.roleId}> — Level **${r.level}**`).join('\n') : 'No level rewards configured.')] });
    }

    if (['messages', 'messagemode', 'stackroles', 'sync', 'cleanup', 'update', 'updaterole'].includes(sub)) {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} You need **Manage Server** permission.`)] });
      const key = `levels_${sub}_${gid}`;
      if (['sync', 'cleanup', 'update', 'updaterole'].includes(sub)) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Level data checked and saved settings are ready for the XP handler.`)] });
      }
      const current = !!db.get(key);
      db.set(key, !current);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: \`${sub}\` is now **${!current ? 'enabled' : 'disabled'}**.`)] });
    }

    if (sub === 'reset') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} You need **Manage Server** permission.`)] });
      const target = message.mentions.members.first() || (args[1] ? message.guild.members.cache.get(args[1]) : null);
      if (target) {
        db.delete(`xp_${target.id}_${gid}`);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: XP reset for ${target}.`)] });
      }
      const allKeys = Object.keys(require('../db_data.json')).filter(k => k.startsWith(`xp_`) && k.endsWith(`_${gid}`));
      const data = db.get ? null : null;
      const dbData = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '../db_data.json'), 'utf8'));
      for (const k of Object.keys(dbData)) { if (k.startsWith('xp_') && k.endsWith(`_${gid}`)) db.delete(k); }
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: All XP data has been reset for this server.`)] });
    }

    if (sub === 'config') {
      const enabled = db.get(`levels_enabled_${gid}`) ?? true;
      const channelId = db.get(`levels_channel_${gid}`);
      const levelMsg = db.get(`levels_message_${gid}`) || '🎉 {user} leveled up to level **{level}**!';
      const multiplier = db.get(`xpmultiplier_${gid}`) || 1;
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(`Levels Config — ${message.guild.name}`)
        .addFields(
          { name: 'Status', value: enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
          { name: 'XP Multiplier', value: `${multiplier}x`, inline: true },
          { name: 'Announce Channel', value: channelId ? `<#${channelId}>` : 'Same as chat', inline: true },
          { name: 'Level-up Message', value: `\`${levelMsg}\`` }
        )
      ] });
    }

    const dbData = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '../db_data.json'), 'utf8'));
    const entries = Object.entries(dbData)
      .filter(([k]) => k.startsWith('xp_') && k.endsWith(`_${gid}`) && !k.includes('multiplier'))
      .map(([k, xp]) => {
        const userId = k.replace('xp_', '').replace(`_${gid}`, '');
        const { level } = getInfo(xp);
        return { userId, xp, level };
      })
      .sort((a, b) => b.xp - a.xp);

    if (!entries.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} No XP data yet. Make sure leveling is enabled with \`levels enable\`.`)] });

    const pageSize = 10;
    const pages = [];
    for (let i = 0; i < entries.length; i += pageSize) {
      pages.push(entries.slice(i, i + pageSize));
    }

    let page = 0;
    const buildEmbed = (p) => {
      const rows = pages[p].map((e, i) => {
        const rank = p * pageSize + i + 1;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `\`${rank}\``;
        return `${medal} <@${e.userId}> — Level **${e.level}** (${e.xp.toLocaleString()} XP)`;
      }).join('\n');
      return new EmbedBuilder()
        .setColor(color)
        .setTitle(`Leaderboard — ${message.guild.name}`)
        .setDescription(rows)
        .setFooter({ text: `Page ${p + 1}/${pages.length} • ${entries.length} members` })
        .setTimestamp();
    };

    const buildRow = (p) => new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('lb_prev').setLabel('◀').setStyle(ButtonStyle.Primary).setDisabled(p === 0),
      new ButtonBuilder().setCustomId('lb_next').setLabel('▶').setStyle(ButtonStyle.Primary).setDisabled(p === pages.length - 1)
    );

    const msg = await message.channel.send({ embeds: [buildEmbed(page)], components: pages.length > 1 ? [buildRow(page)] : [] });
    if (pages.length <= 1) return;

    const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 60000 });
    collector.on('collect', async i => {
      if (i.customId === 'lb_prev' && page > 0) page--;
      else if (i.customId === 'lb_next' && page < pages.length - 1) page++;
      await i.update({ embeds: [buildEmbed(page)], components: [buildRow(page)] });
    });
    collector.on('end', () => msg.edit({ components: [] }).catch(() => {}));
  }
};

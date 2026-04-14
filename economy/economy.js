const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { isEnabled, fmt, getScope, getWallet, getBank } = require('./utils');

const PRESETS = {
  starter:  { name: 'Starter',  daily: 200,  workMin: 100, workMax: 300 },
  hardcore: { name: 'Hardcore', daily: 50,   workMin: 25,  workMax: 100 },
  rich:     { name: 'Rich',     daily: 1000, workMin: 500, workMax: 2000 },
};

module.exports = {
  category: 'economy',
  help: [
    {
        name: 'economy',
        description: 'Manage server economy settings',
        aliases: 'eco',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'economy',
        example: 'economy'
    },
    {
        name: 'economy reset',
        description: "Reset a user's economy data",
        aliases: 'n/a',
        parameters: '(user)',
        information: 'MANAGE_GUILD',
        usage: 'economy reset (user)',
        example: 'economy reset user'
    },
    {
        name: 'economy set',
        description: "Set a user's balance",
        aliases: 'n/a',
        parameters: '(user) (amount)',
        information: 'MANAGE_GUILD',
        usage: 'economy set (user) (amount)',
        example: 'economy set user'
    }
],

    name: 'economy',
  aliases: ['eco'],

  run: async (client, message, args) => {
    const guildId = message.guild.id;
    const sub = (args[0] || '').toLowerCase();

    const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);
    const isManage = message.member.permissions.has(PermissionFlagsBits.ManageGuild);

    if (sub === 'enable') {
      if (!isManage) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: You need **Manage Server** permission.`)] });
      db.set(`economy.${guildId}.enabled`, true);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Economy system **enabled**.`)] });
    }

    if (sub === 'disable') {
      if (!isManage) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: You need **Manage Server** permission.`)] });
      db.set(`economy.${guildId}.enabled`, false);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Economy system **disabled**.`)] });
    }

    if (sub === 'mode') {
      if (!isManage) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: You need **Manage Server** permission.`)] });
      const mode = (args[1] || '').toLowerCase();
      if (!['guild', 'global'].includes(mode)) {
        const current = db.get(`economy.${guildId}.mode`) || 'guild';
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Current mode: **${current}**. Use \`economy mode guild\` or \`economy mode global\`.`)] });
      }
      db.set(`economy.${guildId}.mode`, mode);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Economy mode set to **${mode}**.`)] });
    }

    if (sub === 'reset') {
      if (!isAdmin) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: You need **Administrator** permission.`)] });
      const scope = getScope(guildId);
      db.delete(`economy.${scope}.wallet`);
      db.delete(`economy.${scope}.bank`);
      db.delete(`economy.${guildId}.daily`);
      db.delete(`economy.${guildId}.work`);
      db.delete(`economy.${guildId}.crime`);
      db.delete(`economy.${guildId}.rob`);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: All economy data for this server has been **reset**.`)] });
    }

    if (sub === 'leaderboard' || sub === 'lb') {
      if (!isEnabled(guildId)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: The economy system is **disabled** in this server.`)] });
      const scope = getScope(guildId);
      const data = db.get(`economy.${scope}`) || {};
      const wallets = data.wallet || {};
      const banks = data.bank || {};
      const allIds = new Set([...Object.keys(wallets), ...Object.keys(banks)]);

      const entries = [];
      for (const uid of allIds) {
        const total = (wallets[uid] || 0) + (banks[uid] || 0);
        entries.push({ uid, total });
      }
      entries.sort((a, b) => b.total - a.total);

      const top10 = entries.slice(0, 10);
      if (!top10.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} No economy data found.`)] });

      const lines = await Promise.all(top10.map(async (e, i) => {
        let name = e.uid;
        try { const u = await client.users.fetch(e.uid); name = u.username; } catch {}
        return `**${i + 1}.** ${name} — ${fmt(e.total)}`;
      }));

      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('💰 Economy Leaderboard').setDescription(lines.join('\n')).setTimestamp()] });
    }

    if (sub === 'config') {
      const enabled = db.get(`economy.${guildId}.enabled`);
      const mode = db.get(`economy.${guildId}.mode`) || 'guild';
      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle('⚙️ Economy Config')
        .addFields(
          { name: 'Status', value: (enabled === null || enabled === true) ? '✅ Enabled' : '❌ Disabled', inline: true },
          { name: 'Mode', value: mode, inline: true }
        )
        .setTimestamp();
      return message.channel.send({ embeds: [embed] });
    }

    if (sub === 'preset') {
      if (!isManage) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: You need **Manage Server** permission.`)] });
      const presetName = (args[1] || '').toLowerCase();
      if (!presetName) {
        const list = Object.keys(PRESETS).map(k => `\`${k}\``).join(', ');
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Available presets: ${list}`)] });
      }
      const preset = PRESETS[presetName];
      if (!preset) {
        const list = Object.keys(PRESETS).map(k => `\`${k}\``).join(', ');
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Unknown preset. Available: ${list}`)] });
      }
      db.set(`economy.${guildId}.preset`, preset);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Applied preset **${preset.name}** — Daily: ${fmt(preset.daily)}, Work: ${fmt(preset.workMin)}–${fmt(preset.workMax)}.`)] });
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('💰 Economy Commands')
      .setDescription(
        '`economy enable` — Enable the economy system\n' +
        '`economy disable` — Disable the economy system\n' +
        '`economy mode [guild/global]` — Switch economy mode\n' +
        '`economy config` — View economy configuration\n' +
        '`economy leaderboard` — View the leaderboard\n' +
        '`economy preset [name]` — Apply a preset config\n' +
        '`economy reset` — Reset all economy data (Admin)'
      );
    message.channel.send({ embeds: [embed] });
  }
};

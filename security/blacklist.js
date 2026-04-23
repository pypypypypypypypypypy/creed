const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color, default_prefix } = require('../config.json');
const { warn, approve } = require('../emojis.json');

const OWNER_ID = '370268185410404353';

module.exports = {
  category: 'security',
  name: 'blacklist',
  aliases: ['bl', 'unbl'],
  help: [
    { name: 'blacklist',         description: 'Blacklist a user from using the bot', aliases: 'bl',   parameters: '(add/remove/list) [user]', information: 'Bot owner only', usage: 'blacklist add @user',          example: 'blacklist add @user' },
    { name: 'blacklist server',  description: 'Blacklist a server (bot will leave it and refuse rejoin)', aliases: 'n/a', parameters: '(add/remove/list) [guild_id]', information: 'Bot owner only', usage: 'blacklist server add 12345', example: 'blacklist server add 123456789012345678' },
  ],

  run: async (client, message, args) => {
    if (message.author.id !== OWNER_ID) return;

    const prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;
    const rawCmd = message.content.slice(prefix.length).trim().split(/\s+/)[0].toLowerCase();
    if (rawCmd === 'unbl') args.unshift('remove');

    const sub = (args[0] || '').toLowerCase();

    // ── Server blacklist subcommand ─────────────────────────────────────────
    if (sub === 'server' || sub === 'guild' || sub === 'srv') {
      const action = (args[1] || 'list').toLowerCase();
      const guildBlacklist = db.get('bot_guild_blacklist') || [];

      if (action === 'list') {
        if (!guildBlacklist.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: The server blacklist is empty.`)] });
        const lines = guildBlacklist.map(id => {
          const g = client.guilds.cache.get(id);
          return g ? `${g.name} (${id})` : `Unknown (${id})`;
        });
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(`Server Blacklist — ${guildBlacklist.length}`).setDescription(lines.map((l, i) => `**${i + 1}.** ${l}`).join('\n'))] });
      }

      if (action === 'add') {
        const id = args[2] || args[1];
        if (!id || !/^\d{17,20}$/.test(id)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Provide a valid guild ID — \`${prefix}blacklist server add <guild_id>\``)] });
        if (guildBlacklist.includes(id)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: That server is already blacklisted.`)] });
        guildBlacklist.push(id);
        db.set('bot_guild_blacklist', guildBlacklist);
        const g = client.guilds.cache.get(id);
        const name = g ? g.name : 'Unknown';
        if (g) await g.leave().catch(() => {});
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: **${name}** (\`${id}\`) blacklisted${g ? ' and left' : ''}.`)] });
      }

      if (action === 'remove' || action === 'rem' || action === 'del') {
        const id = args[2] || args[1];
        if (!guildBlacklist.includes(id)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: That server is not blacklisted.`)] });
        db.set('bot_guild_blacklist', guildBlacklist.filter(g => g !== id));
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Server \`${id}\` removed from blacklist.`)] });
      }

      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Use \`${prefix}blacklist server add|remove|list <guild_id>\`.`)] });
    }

    // ── User blacklist ──────────────────────────────────────────────────────
    const blacklist = db.get('bot_blacklist') || [];

    if (!sub || sub === 'list') {
      if (!blacklist.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: The blacklist is empty.`)] });
      const lines = await Promise.all(blacklist.map(async id => {
        const user = await client.users.fetch(id).catch(() => null);
        return user ? `${user.tag} (${id})` : `Unknown (${id})`;
      }));
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(`Bot Blacklist — ${blacklist.length} user${blacklist.length !== 1 ? 's' : ''}`).setDescription(lines.map((l, i) => `**${i + 1}.** ${l}`).join('\n'))] });
    }

    if (sub === 'add') {
      const target = message.mentions.users.first() || await client.users.fetch(args[1]).catch(() => null);
      if (!target) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Please mention a user or provide their ID.`)] });
      if (target.id === OWNER_ID) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: You cannot blacklist yourself.`)] });
      if (blacklist.includes(target.id)) {
        // Silently ignore re-adding an already blacklisted user
        return;
      }
      blacklist.push(target.id);
      db.set('bot_blacklist', blacklist);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: **${target.tag}** has been **blacklisted** from the bot.`)] });
    }

    if (sub === 'remove') {
      const target = message.mentions.users.first() || await client.users.fetch(args[1]).catch(() => null);
      if (!target) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Please mention a user or provide their ID.`)] });
      if (!blacklist.includes(target.id)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: **${target.tag}** is not blacklisted.`)] });
      db.set('bot_blacklist', blacklist.filter(id => id !== target.id));
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: **${target.tag}** has been **removed** from the blacklist.`)] });
    }

    return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Unknown subcommand. Use \`blacklist add\`, \`blacklist remove\`, \`blacklist list\`, or \`blacklist server add|remove|list <guild_id>\`.`)] });
  },
};

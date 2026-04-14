const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');

module.exports = {
  name: 'wordstats',
  aliases: ['wstats', 'ws'],
  category: 'utility',
  help: [
    { name: 'wordstats <word> [user]', description: 'View how many times a word has been used', aliases: 'wstats, ws', parameters: '<word> [user]', information: 'n/a', usage: 'wordstats <word> [user]', example: 'wordstats hello @user' },
    { name: 'wordstats track <word>', description: 'Start tracking a word in this server', aliases: 'n/a', parameters: '<word>', information: 'MANAGE_GUILD', usage: 'wordstats track <word>', example: 'wordstats track hello' },
    { name: 'wordstats untrack <word>', description: 'Stop tracking a word', aliases: 'n/a', parameters: '<word>', information: 'MANAGE_GUILD', usage: 'wordstats untrack <word>', example: 'wordstats untrack hello' },
    { name: 'wordstats tracked', description: 'View all tracked words', aliases: 'n/a', parameters: 'n/a', information: 'n/a', usage: 'wordstats tracked', example: 'wordstats tracked' },
  ],

  run: async (client, message, args) => {
    const { warn, approve } = require('../emojis.json');
    const sub = args[0]?.toLowerCase();

    if (sub === 'track') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: You need **Manage Server** permission.`)] });
      const word = args.slice(1).join(' ').toLowerCase();
      if (!word) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Provide a word to track.`)] });
      const tracked = db.get(`wstats_tracked_${message.guild.id}`) || [];
      if (tracked.includes(word)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} \`${word}\` is already being tracked.`)] });
      tracked.push(word);
      db.set(`wstats_tracked_${message.guild.id}`, tracked);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Now tracking \`${word}\`.`)] });
    }

    if (sub === 'untrack') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: You need **Manage Server** permission.`)] });
      const word = args.slice(1).join(' ').toLowerCase();
      const tracked = db.get(`wstats_tracked_${message.guild.id}`) || [];
      if (!tracked.includes(word)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} \`${word}\` is not being tracked.`)] });
      db.set(`wstats_tracked_${message.guild.id}`, tracked.filter(w => w !== word));
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Stopped tracking \`${word}\`.`)] });
    }

    if (sub === 'tracked') {
      const tracked = db.get(`wstats_tracked_${message.guild.id}`) || [];
      if (!tracked.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} No words are being tracked. Use \`wordstats track <word>\` to start.`)] });
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(`Tracked Words — ${message.guild.name}`).setDescription(tracked.map((w, i) => `\`${i + 1}\` ${w}`).join('\n'))] });
    }

    const word = (sub || '').toLowerCase();
    if (!word) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Command: wordstats').setDescription('Track and view word usage statistics in this server.').addFields({ name: 'Subcommands', value: '`wordstats <word> [user]` — View usage\n`wordstats track <word>` — Track a word\n`wordstats untrack <word>` — Untrack a word\n`wordstats tracked` — View all tracked words' })] });

    const target = message.mentions.members.first() || (args[1] ? message.guild.members.cache.get(args[1]) : null);

    if (target) {
      const count = db.get(`wstats_${message.guild.id}_${word}_${target.id}`) || 0;
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`**${target.user.username}** has used \`${word}\` **${count}** time(s) in this server.`)] });
    }

    const guildCount = db.get(`wstats_${message.guild.id}_${word}_total`) || 0;
    const data = db.get(`wstats_top_${message.guild.id}_${word}`) || {};
    const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 10);

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`Word Stats — "${word}"`)
      .setDescription(`Used **${guildCount}** time(s) total in **${message.guild.name}**`)
      .setFooter({ text: `Top 10 users` });

    if (sorted.length) {
      embed.addFields({ name: 'Top Users', value: sorted.map(([id, cnt], i) => `\`${i + 1}\` <@${id}> — **${cnt}** uses`).join('\n') });
    }

    return message.channel.send({ embeds: [embed] });
  }
};

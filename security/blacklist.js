const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color, default_prefix } = require('../config.json');
const { warn, approve } = require('../emojis.json');

const OWNER_ID = '370268185410404353';

module.exports = {
  category: 'security',
  help: [
    {
      name: 'blacklist',
      description: 'Blacklist a user from using the bot',
      aliases: 'bl',
      parameters: '(add/remove/list) [user]',
      information: 'Bot owner only',
      usage: 'blacklist add @user | blacklist remove @user | blacklist list',
      example: 'blacklist add @user'
    }
  ],
  name: 'blacklist',
  aliases: ['bl', 'unbl'],
  run: async (client, message, args) => {
    if (message.author.id !== OWNER_ID) return;

    const prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;
    const rawCmd = message.content.slice(prefix.length).trim().split(/\s+/)[0].toLowerCase();
    if (rawCmd === 'unbl') args.unshift('remove');

    const sub = (args[0] || '').toLowerCase();
    const blacklist = db.get('bot_blacklist') || [];

    if (!sub || sub === 'list') {
      if (!blacklist.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: The blacklist is empty.`)] });
      const lines = await Promise.all(blacklist.map(async id => {
        const user = await client.users.fetch(id).catch(() => null);
        return user ? `${user.tag} (${id})` : `Unknown (${id})`;
      }));
      return message.channel.send({
        embeds: [new EmbedBuilder()
          .setColor(color)
          .setTitle(`Bot Blacklist — ${blacklist.length} user${blacklist.length !== 1 ? 's' : ''}`)
          .setDescription(lines.map((l, i) => `**${i + 1}.** ${l}`).join('\n'))
        ]
      });
    }

    if (sub === 'add') {
      const target = message.mentions.users.first() || await client.users.fetch(args[1]).catch(() => null);
      if (!target) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Please mention a user or provide their ID.`)] });
      if (target.id === OWNER_ID) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: You cannot blacklist yourself.`)] });
      if (blacklist.includes(target.id)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: **${target.tag}** is already blacklisted.`)] });
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

    return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Unknown subcommand. Use \`blacklist add\`, \`blacklist remove\`, or \`blacklist list\`.`)] });
  }
};

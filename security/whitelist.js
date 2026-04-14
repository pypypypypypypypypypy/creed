const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'security',
  help: [
    {
        name: 'whitelist',
        description: 'Manage the antinuke whitelist',
        aliases: 'n/a',
        parameters: '(user)',
        information: 'SERVER_OWNER',
        usage: 'whitelist (user)',
        example: 'whitelist user'
    },
    {
        name: 'whitelist add',
        description: 'Add a user to the whitelist',
        aliases: 'n/a',
        parameters: '(user)',
        information: 'SERVER_OWNER',
        usage: 'whitelist add (user)',
        example: 'whitelist add user'
    },
    {
        name: 'whitelist remove',
        description: 'Remove a user from the whitelist',
        aliases: 'n/a',
        parameters: '(user)',
        information: 'SERVER_OWNER',
        usage: 'whitelist remove (user)',
        example: 'whitelist remove user'
    },
    {
        name: 'whitelist list',
        description: 'List all whitelisted users',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'SERVER_OWNER',
        usage: 'whitelist list',
        example: 'whitelist list'
    },
    {
        name: 'whitelist reset',
        description: 'Reset the whitelist',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'SERVER_OWNER',
        usage: 'whitelist reset',
        example: 'whitelist reset'
    }
],

    name: 'whitelist',
  aliases: ['wl'],
  category: 'security',

  run: async (client, message, args) => {
    const prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;
    const sub = (args[0] || '').toLowerCase();
    const guildId = message.guild.id;

    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're missing permission: \`administrator\``)] });

    if (!sub) {
      const embed = new EmbedBuilder()
        .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
        .setTitle('Command: whitelist')
        .setDescription('Manage the antinuke whitelist. Whitelisted users are exempt from antinuke rate limits.')
        .addFields(
          { name: '**Aliases**', value: 'wl', inline: true },
          { name: '**Parameters**', value: '[subcommand]', inline: true },
          { name: '**Information**', value: 'Requires Administrator', inline: true },
          {
            name: '**Subcommands**',
            value: [
              `\`${prefix}whitelist add @user\` — Add a user to the whitelist`,
              `\`${prefix}whitelist remove @user\` — Remove a user from the whitelist`,
              `\`${prefix}whitelist list\` — View all whitelisted users`,
              `\`${prefix}whitelist clear\` — Clear the entire whitelist`,
            ].join('\n')
          }
        )
        .setFooter({ text: 'Module: security' })
        .setTimestamp()
        .setColor(color);
      return message.channel.send({ embeds: [embed] });
    }

    // ,whitelist add @user
    if (sub === 'add') {
      const target = message.mentions.members.first()
        || message.guild.members.cache.get(args[1]);

      if (!target)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Please mention a user or provide their ID.`)] });

      if (target.id === message.author.id)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You cannot whitelist yourself.`)] });

      const wl = db.get(`antinuke_whitelist_${guildId}`) || [];
      if (wl.includes(target.id))
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: **${target.user.username}** is already whitelisted.`)] });

      wl.push(target.id);
      db.set(`antinuke_whitelist_${guildId}`, wl);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: **${target.user.username}** has been added to the antinuke whitelist.`)] });
    }

    // ,whitelist remove @user
    if (sub === 'remove') {
      const target = message.mentions.members.first()
        || message.guild.members.cache.get(args[1]);

      if (!target)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Please mention a user or provide their ID.`)] });

      let wl = db.get(`antinuke_whitelist_${guildId}`) || [];
      if (!wl.includes(target.id))
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: **${target.user.username}** is not on the whitelist.`)] });

      wl = wl.filter(id => id !== target.id);
      db.set(`antinuke_whitelist_${guildId}`, wl);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: **${target.user.username}** has been removed from the antinuke whitelist.`)] });
    }

    // ,whitelist list
    if (sub === 'list') {
      const wl = db.get(`antinuke_whitelist_${guildId}`) || [];
      if (!wl.length)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: The antinuke whitelist is empty.`)] });

      const lines = await Promise.all(wl.map(async id => {
        const member = message.guild.members.cache.get(id)
          || await message.guild.members.fetch(id).catch(() => null);
        return member ? `${member.user.username} (${id})` : `Unknown User (${id})`;
      }));

      return message.channel.send({
        embeds: [new EmbedBuilder()
          .setColor(color)
          .setTitle(`Antinuke Whitelist — ${wl.length} user${wl.length !== 1 ? 's' : ''}`)
          .setDescription(lines.map((l, i) => `**${i + 1}.** ${l}`).join('\n'))
          .setFooter({ text: 'Module: security' })
          .setTimestamp()
        ]
      });
    }

    // ,whitelist clear
    if (sub === 'clear') {
      db.set(`antinuke_whitelist_${guildId}`, []);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: The antinuke whitelist has been cleared.`)] });
    }

    return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Unknown subcommand. Run \`${prefix}whitelist\` to see all available subcommands.`)] });
  }
};

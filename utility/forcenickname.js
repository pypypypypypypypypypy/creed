const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { default_prefix, color } = require('../config.json');
const { warn, deny, approve } = require('../emojis.json');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'forcenickname',
        description: 'Lock a nickname on a user',
        aliases: 'forcenick, fn',
        parameters: '(user) (nickname)',
        information: 'MANAGE_NICKNAMES',
        usage: 'forcenickname (user) (nickname)',
        example: 'forcenickname user nickname'
    }
],

    name: 'forcenickname',
  aliases: ['forcenick', 'fn'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.ManageNicknames))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_nicknames\``)] });

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageNicknames))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`manage_nicknames\``)] });

    const sub = (args[0] || '').toLowerCase();

    if (sub === 'remove') {
      const member = message.mentions.members.first() || message.guild.members.cache.get(args[1]);
      if (!member)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Usage: \`${prefix}forcenickname remove <member>\``)] });

      db.delete(`forcenick_${message.guild.id}_${member.id}`);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Removed forced nickname from **${member.user.tag}**.`)] });
    }

    if (sub === 'list') {
      const allKeys = Object.keys(require('../db_data.json') || {}).filter(k => k.startsWith(`forcenick_${message.guild.id}_`));
      if (allKeys.length === 0)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: No forced nicknames set.`)] });

      const desc = allKeys.map(key => {
        const userId = key.split('_').pop();
        const nick = db.get(key);
        return `<@${userId}> — **${nick}**`;
      }).join('\n');

      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Forced Nicknames').setDescription(desc)] });
    }

    const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!member)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Usage: \`${prefix}forcenickname <member> <nickname>\`\n\`${prefix}forcenickname remove <member>\`\n\`${prefix}forcenickname list\``)] });

    const nickname = args.slice(1).join(' ');
    if (!nickname)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Please provide a **nickname** to force.`)] });

    if (!member.manageable)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('fe6464').setDescription(`${deny} ${message.author}: I cannot change that member's nickname due to **hierarchy**.`)] });

    try {
      await member.setNickname(nickname, `Forced by ${message.author.tag}`);
      db.set(`forcenick_${message.guild.id}_${member.id}`, nickname);
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Forced **${member.user.tag}**'s nickname to **${nickname}**`)] });
    } catch (err) {
      message.channel.send({ embeds: [new EmbedBuilder().setColor('fe6464').setDescription(`${deny} ${message.author}: Failed to set nickname: ${err.message}`)] });
    }
  }
};

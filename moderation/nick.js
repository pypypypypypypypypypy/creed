const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { paginate } = require('../utils/paginate');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'moderation',
  help: [
    {
        name: 'nick',
        description: "Change a user's nickname",
        aliases: 'n/a',
        parameters: '(user) [nickname]',
        information: 'MANAGE_NICKNAMES',
        usage: 'nick (user) [nickname]',
        example: 'nick user nickname'
    }
],

    name: 'nick',
  aliases: ['nickname'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.ManageNicknames)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_nicknames\``)] });
    }

    if (!args[0]) return paginate(message, [
      { name: 'nick', description: 'Changes the nickname of a member', aliases: 'nickname', parameters: '(member) [nickname]', information: 'MANAGE_NICKNAMES', usage: `${prefix}nick (member) [nickname]`, example: `${prefix}nick @user Cool Name` }
    ], 'moderation');

    const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!member) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Couldn't find that member.`)] });

    const newNick = args.slice(1).join(' ') || null;

    if (!member.manageable) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('fe6464').setDescription(`${warn} ${message.author}: I cannot change this member's nickname due to hierarchy.`)] });
    }

    await member.setNickname(newNick);
    const desc = newNick
      ? `${approve} ${message.author}: Set **${member.user.tag}**'s nickname to **${newNick}**.`
      : `${approve} ${message.author}: Removed **${member.user.tag}**'s nickname.`;
    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(desc)] });
  }
};

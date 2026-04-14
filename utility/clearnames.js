const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { default_prefix, color } = require('../config.json');
const { warn, deny, approve } = require('../emojis.json');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'clearnames',
        description: 'Clear nicknames for a user or all members',
        aliases: 'n/a',
        parameters: '[user]',
        information: 'MANAGE_NICKNAMES',
        usage: 'clearnames [user]',
        example: 'clearnames user'
    }
],

    name: 'clearnames',
  aliases: ['cn', 'clearnamehistory'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);

    if (member && member.id !== message.author.id) {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageNicknames))
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_nicknames\``)] });
    }

    const targetId = member ? member.id : message.author.id;
    const targetTag = member ? member.user.tag : message.author.tag;

    const history = db.get(`namehistory_${targetId}`);
    if (!history || history.length === 0)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: No name history found for **${targetTag}**.`)] });

    db.delete(`namehistory_${targetId}`);

    message.channel.send({
      embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Cleared name history for **${targetTag}**.`)]
    });
  }
};

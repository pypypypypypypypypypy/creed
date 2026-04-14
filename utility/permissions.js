const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'permissions',
        description: 'View permissions for a user in this channel',
        aliases: 'perms',
        parameters: '[user]',
        information: 'n/a',
        usage: 'permissions [user]',
        example: 'permissions user'
    }
],

    name: 'permissions',
  aliases: ['perms'],

  run: async (client, message, args) => {
    const member = message.mentions.members.first() || (args[0] ? message.guild.members.cache.get(args[0]) : message.member);
    if (!member) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Member not found.`)] });

    const perms = member.permissions.toArray();
    const has = perms.map(p => `✅ \`${p}\``);
    const all = Object.keys(PermissionsBitField.Flags);
    const missing = all.filter(p => !perms.includes(p)).map(p => `❌ \`${p}\``);

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`Permissions for ${member.user.tag}`)
      .addFields(
        { name: `✅ Has (${has.length})`, value: has.slice(0, 20).join('\n') || 'None', inline: true },
        { name: `❌ Missing (${missing.length})`, value: missing.slice(0, 20).join('\n') || 'None', inline: true }
      )
      .setFooter({ text: `Module: utility` })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};

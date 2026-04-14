const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'invites',
        description: 'View invite statistics for a user',
        aliases: 'n/a',
        parameters: '[user]',
        information: 'n/a',
        usage: 'invites [user]',
        example: 'invites user'
    }
],

    name: 'invites',

  run: async (client, message, args) => {
    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]) || message.member;

    const guildInvites = await message.guild.invites.fetch().catch(() => null);
    if (!guildInvites) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: I don't have permission to view invites.`)] });

    const userInvites = guildInvites.filter(i => i.inviter?.id === target.id);
    const totalUses = userInvites.reduce((acc, inv) => acc + (inv.uses || 0), 0);

    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({ name: target.user.tag, iconURL: target.user.displayAvatarURL({ forceStatic: false }) })
      .setDescription(`**${target.user.tag}** has **${totalUses}** invite uses across **${userInvites.size}** invite(s).`)
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { default_prefix, color } = require('../config.json');
const { warn, deny, approve } = require('../emojis.json');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'clearinvites',
        description: 'Clear all server invites',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'clearinvites',
        example: 'clearinvites'
    }
],

    name: 'clearinvites',
  aliases: ['deleteinvites'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageGuild))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`manage_guild\``)] });

    try {
      const invites = await message.guild.invites.fetch();
      const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);

      if (member) {
        const userInvites = invites.filter(i => i.inviterId === member.id);
        if (userInvites.size === 0)
          return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: **${member.user.tag}** has no active invites.`)] });

        for (const [, invite] of userInvites) {
          await invite.delete().catch(() => {});
        }
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Cleared **${userInvites.size}** invite(s) from **${member.user.tag}**.`)] });
      }

      if (invites.size === 0)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: No active invites to clear.`)] });

      for (const [, invite] of invites) {
        await invite.delete().catch(() => {});
      }

      message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Cleared **${invites.size}** server invite(s).`)] });
    } catch (err) {
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: Failed to clear invites: ${err.message}`)] });
    }
  }
};

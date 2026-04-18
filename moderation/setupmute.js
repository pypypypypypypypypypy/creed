const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { default_prefix, color } = require('../config.json');
const { warn, deny, approve } = require('../emojis.json');

module.exports = {
  category: 'moderation',
  help: [
    {
        name: 'setupmute',
        description: 'Set up the muted role automatically',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_ROLES',
        usage: 'setupmute',
        example: 'setupmute'
    }
],

    name: 'setupmute',
  aliases: ['createmute'],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`administrator\``)] });

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`manage_roles\``)] });

    let muteRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === 'muted');
    if (muteRole)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: A **Muted** role already exists.`)] });

    try {
      muteRole = await message.guild.roles.create({
        name: 'Muted',
        permissions: [],
        reason: 'Mute role setup'
      });

      let count = 0;
      for (const [, channel] of message.guild.channels.cache) {
        try {
          await channel.permissionOverwrites.edit(muteRole, {
            SendMessages: false,
            AddReactions: false,
            Speak: false,
            Connect: false
          });
          count++;
        } catch {}
      }

      db.set(`mute_role_${message.guild.id}`, muteRole.id);

      message.channel.send({
        embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Created **Muted** role and applied overrides to **${count}** channels.`)]
      });
    } catch (err) {
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: Failed to set up mute role: ${err.message}`)] });
    }
  }
};

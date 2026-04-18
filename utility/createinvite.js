const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'createinvite',
        description: 'Create a server invite link',
        aliases: 'n/a',
        parameters: '[channel]',
        information: 'CREATE_INSTANT_INVITE',
        usage: 'createinvite [channel]',
        example: 'createinvite channel'
    }
],

    name: 'createinvite',
  aliases: ['makeinvite', 'newinvite'],

  run: async (client, message, args) => {
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.CreateInstantInvite))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`create_instant_invite\``)] });

    const channel = message.mentions.channels.first() || message.guild.systemChannel || message.channel;
    const invite = await channel.createInvite({ maxAge: 86400, maxUses: 0, reason: `Created by ${message.author.tag}` }).catch(() => null);

    if (!invite) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Could not create invite for that channel.`)] });

    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Created invite for ${channel}: **${invite.url}** (expires in 24h, unlimited uses)`)] });
  }
};

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
        name: 'unlockall',
        description: 'Unlock all locked channels',
        aliases: 'n/a',
        parameters: '[reason]',
        information: 'MANAGE_CHANNELS',
        usage: 'unlockall [reason]',
        example: 'unlockall reason'
    }
],

    name: 'unlockall',

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_channels\``)] });
    }
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`manage_channels\``)] });
    }

    const everyoneRole = message.guild.roles.everyone;
    const textChannels = message.guild.channels.cache.filter(c => c.isTextBased());
    let count = 0;
    for (const [, ch] of textChannels) {
      await ch.permissionOverwrites.edit(everyoneRole, { SendMessages: null }).then(() => count++).catch(() => {});
    }

    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Unlocked **${count}** channels.`)] });
  }
};

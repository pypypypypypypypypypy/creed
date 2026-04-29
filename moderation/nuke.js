const { EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../db');
const { default_prefix, color } = require('../config.json');
const { warn, deny, approve } = require('../emojis.json');
const { logModAction } = require('../utils/modlog');

module.exports = {
  category: 'moderation',
  help: [
    {
        name: 'nuke',
        description: 'Nuke a channel by cloning and deleting it',
        aliases: 'n/a',
        parameters: '[channel]',
        information: 'MANAGE_CHANNELS',
        usage: 'nuke [channel]',
        example: 'nuke channel'
    }
],

    name: 'nuke',
  aliases: [],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_channels\``)] });

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`manage_channels\``)] });

    const channel = message.mentions.channels.first() || message.channel;

    const confirm = new EmbedBuilder()
      .setColor(color)
      .setDescription(`${warn} ${message.author}: Are you sure you want to **nuke** ${channel}? This will delete and recreate the channel. Type \`yes\` to confirm.`);

    await message.channel.send({ embeds: [confirm] });

    const filter = m => m.author.id === message.author.id && m.content.toLowerCase() === 'yes';
    const collected = await message.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] }).catch(() => null);

    if (!collected || collected.size === 0)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: Nuke cancelled.`)] });

    try {
      const pos = channel.position;
      const parent = channel.parent;
      const perms = channel.permissionOverwrites.cache.map(o => ({
        id: o.id,
        allow: o.allow.bitfield,
        deny: o.deny.bitfield,
        type: o.type
      }));

      const newChannel = await message.guild.channels.create({
        name: channel.name,
        type: channel.type,
        topic: channel.topic || undefined,
        nsfw: channel.nsfw,
        rateLimitPerUser: channel.rateLimitPerUser,
        parent: parent ? parent.id : undefined,
        permissionOverwrites: perms,
        position: pos
      });

      await channel.delete('Channel nuked');

      await newChannel.send({
        embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} Channel has been **nuked** by ${message.author}.`).setImage('https://media.tenor.com/images/2e1d68962bff7b9ab45f498e93c5e8e2/tenor.gif')]
      });

      logModAction(message.guild, {
        action: 'Nuke',
        channel: newChannel,
        moderator: message.author,
        reason: 'No Reason Provided'
      }).catch(() => {});
    } catch (err) {
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: Failed to nuke channel: ${err.message}`)] });
    }
  }
};

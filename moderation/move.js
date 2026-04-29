const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { default_prefix, color } = require('../config.json');
const { warn, deny, approve } = require('../emojis.json');

module.exports = {
  category: 'moderation',
  help: [
    {
        name: 'move',
        description: 'Move a user to a different voice channel',
        aliases: 'n/a',
        parameters: '(user) (channel)',
        information: 'MOVE_MEMBERS',
        usage: 'move (user) (channel)',
        example: 'move user channel'
    }
],

    name: 'move',
  aliases: [],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.MoveMembers))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`move_members\``)] });

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.MoveMembers))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`move_members\``)] });

    if (!args[0])
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Usage: \`${prefix}move <member> <voice channel>\``)] });

    const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!member)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: **Invalid** member.`)] });

    if (!member.voice.channel)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: That member is not in a **voice channel**.`)] });

    const channelName = args.slice(1).join(' ');
    if (!channelName)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Please specify a **voice channel** to move the member to.`)] });

    const voiceChannel = message.guild.channels.cache.find(c => c.type === 2 && c.name.toLowerCase().includes(channelName.toLowerCase()))
      || message.mentions.channels.first()
      || message.guild.channels.cache.get(args[1]);

    if (!voiceChannel || voiceChannel.type !== 2)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: Could not find that **voice channel**.`)] });

    await member.voice.setChannel(voiceChannel);
    message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Moved **${member.user.tag}** to **${voiceChannel.name}**`)] });
  }
};

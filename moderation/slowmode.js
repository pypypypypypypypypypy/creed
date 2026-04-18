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
        name: 'slowmode',
        description: 'Set the slowmode for a channel',
        aliases: 'sm',
        parameters: '[channel] (duration)',
        information: 'MANAGE_CHANNELS',
        usage: 'slowmode [channel] (duration)',
        example: 'slowmode channel duration'
    }
],

    name: 'slowmode',
  aliases: ['slow', 'sm'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_channels\``)] });
    }

    if (!args[0]) return paginate(message, [
      { name: 'slowmode', description: 'Sets slowmode for the current channel', aliases: 'slow, sm', parameters: '(seconds)', information: 'MANAGE_CHANNELS', usage: `${prefix}slowmode (seconds)`, example: `${prefix}slowmode 5` }
    ], 'moderation');

    const seconds = parseInt(args[0]);
    if (isNaN(seconds) || seconds < 0 || seconds > 21600) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please provide a number between **0** and **21600** seconds.`)] });
    }

    await message.channel.setRateLimitPerUser(seconds);
    const desc = seconds === 0
      ? `${approve} ${message.author}: Slowmode has been **disabled** in ${message.channel}.`
      : `${approve} ${message.author}: Slowmode set to **${seconds} second(s)** in ${message.channel}.`;
    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(desc)] });
  }
};

const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'message',
  help: [
    {
        name: 'copyid',
        description: 'Copy a message by ID to another channel',
        aliases: 'n/a',
        parameters: '(message id) (channel)',
        information: 'MANAGE_MESSAGES',
        usage: 'copyid (message id) (channel)',
        example: 'copyid message id'
    }
],

    name: 'copyid',

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    const target = message.mentions.members.first() || (args[0] ? message.guild.members.cache.get(args[0]) : null);
    if (!target) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}copyid <member>\``)] });

    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`The ID of **${target.user.tag}** is \`${target.id}\``)] });
  }
};

const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color, default_prefix } = require('../config.json');
const { getRpGif } = require('./_base');

module.exports = {
  category: 'roleplay',
  help: [
    {
        name: 'hug',
        description: 'Perform the hug action on a user',
        aliases: 'n/a',
        parameters: '[user]',
        information: 'n/a',
        usage: 'hug [user]',
        example: 'hug user'
    }
],

    name: 'hug',
  run: async (client, message, args) => {
    if (!db.get(`roleplay_${message.guild.id}`)) {
      const prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Roleplay commands are **disabled**. An Administrator must run \`${prefix}roleplay enable\` first.`)] });
    }
    const target = message.mentions.members.first();
    if (!target) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Please **mention** a member.`)] });
    const gif = await getRpGif('hug');
    const embed = new EmbedBuilder()
      .setColor(color)
      .setDescription(`**${message.member.displayName}** hugged **${target.displayName}** 🫂`)
      .setImage(gif || null);
    message.channel.send({ embeds: [embed] });
  }
};

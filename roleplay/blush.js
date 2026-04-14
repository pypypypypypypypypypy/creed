const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color, default_prefix } = require('../config.json');
const { getRpGif } = require('./_base');

module.exports = {
  category: 'roleplay',
  help: [
    {
        name: 'blush',
        description: 'Perform the blush action',
        aliases: 'n/a',
        parameters: '[user]',
        information: 'n/a',
        usage: 'blush [user]',
        example: 'blush user'
    }
],

    name: 'blush',
  run: async (client, message, args) => {
    if (!db.get(`roleplay_${message.guild.id}`)) {
      const prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Roleplay commands are **disabled**. An Administrator must run \`${prefix}roleplay enable\` first.`)] });
    }
    const target = message.mentions.members.first();
    const gif = await getRpGif('blush');
    const embed = new EmbedBuilder()
      .setColor(color)
      .setDescription(target
        ? `**${message.member.displayName}** is blushing because of **${target.displayName}** 😊`
        : `**${message.member.displayName}** is blushing 😊`)
      .setImage(gif || null);
    message.channel.send({ embeds: [embed] });
  }
};

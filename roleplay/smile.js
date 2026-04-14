const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color, default_prefix } = require('../config.json');
const { getRpGif } = require('./_base');

module.exports = {
  category: 'roleplay',
  help: [
    {
        name: 'smile',
        description: 'Perform the smile action',
        aliases: 'n/a',
        parameters: '[user]',
        information: 'n/a',
        usage: 'smile [user]',
        example: 'smile user'
    }
],

    name: 'smile',
  run: async (client, message, args) => {
    if (!db.get(`roleplay_${message.guild.id}`)) {
      const prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Roleplay commands are **disabled**. An Administrator must run \`${prefix}roleplay enable\` first.`)] });
    }
    const target = message.mentions.members.first();
    if (!target) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Please **mention** a member.`)] });
    const gif = await getRpGif('smile');
    const embed = new EmbedBuilder()
      .setColor(color)
      .setDescription(`**${message.member.displayName}** smiled at **${target.displayName}** 😊`)
      .setImage(gif || null);
    message.channel.send({ embeds: [embed] });
  }
};

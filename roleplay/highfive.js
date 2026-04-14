const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color, default_prefix } = require('../config.json');
const { getRpGif } = require('./_base');

module.exports = {
  category: 'roleplay',
  help: [
    {
        name: 'highfive',
        description: 'Perform the highfive action on a user',
        aliases: 'hifive, hi5',
        parameters: '[user]',
        information: 'n/a',
        usage: 'highfive [user]',
        example: 'highfive user'
    }
],

    name: 'highfive',
  aliases: ['hifive', 'hi5'],
  run: async (client, message, args) => {
    if (!db.get(`roleplay_${message.guild.id}`)) {
      const prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Roleplay commands are **disabled**. An Administrator must run \`${prefix}roleplay enable\` first.`)] });
    }
    const target = message.mentions.members.first();
    if (!target) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Please **mention** a member.`)] });
    const gif = await getRpGif('highfive');
    const embed = new EmbedBuilder()
      .setColor(color)
      .setDescription(`**${message.member.displayName}** high-fived **${target.displayName}** ✋`)
      .setImage(gif || null);
    message.channel.send({ embeds: [embed] });
  }
};

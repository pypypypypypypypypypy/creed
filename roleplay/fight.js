const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const { getRpGif } = require('./_base');

module.exports = {
  category: 'roleplay',
  help: [
    {
        name: 'fight',
        description: 'Pick a fight with someone and punch them in the face',
        aliases: 'n/a',
        parameters: '[user]',
        information: 'n/a',
        usage: 'fight [user]',
        example: 'fight @user'
    }
],

  name: 'fight',
  run: async (client, message, args) => {
    const target = message.mentions.members.first();
    if (!target) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Please **mention** a member to fight.`)] });
    const gif = await getRpGif('punch');
    const embed = new EmbedBuilder()
      .setColor(color)
      .setDescription(`**${message.member.displayName}** punches **${target.displayName}** right in the face! 👊💥`)
      .setImage(gif || null);
    message.channel.send({ embeds: [embed] });
  }
};

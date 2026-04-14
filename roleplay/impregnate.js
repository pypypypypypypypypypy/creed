const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const fetch = require('node-superfetch');

async function getHentaiGif() {
  try {
    const { body } = await fetch.get('https://api.waifu.pics/nsfw/blowjob');
    if (body.url) return body.url;
  } catch {}
  try {
    const { body } = await fetch.get('https://purrbot.site/api/img/nsfw/blowjob/gif');
    if (body.link) return body.link;
  } catch {}
  return null;
}

module.exports = {
  category: 'roleplay',
  help: [
    {
      name: 'impregnate',
      description: 'Perform the impregnate roleplay action on a user (NSFW)',
      aliases: 'n/a',
      parameters: '[user]',
      information: 'NSFW channel required',
      usage: 'impregnate [user]',
      example: 'impregnate @user'
    }
  ],
  name: 'impregnate',
  run: async (client, message, args) => {
    if (!message.channel.nsfw) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('fe6464').setDescription(`🔞 ${message.author}: This command can only be used in an **NSFW** channel.`)] });
    }
    const target = message.mentions.members.first();
    if (!target) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Please **mention** a member.`)] });
    const gif = await getHentaiGif();
    const embed = new EmbedBuilder()
      .setColor(color)
      .setDescription(`**${message.member.displayName}** impregnated **${target.displayName}** 🍼🔞`);
    if (gif) embed.setImage(gif);
    message.channel.send({ embeds: [embed] });
  }
};

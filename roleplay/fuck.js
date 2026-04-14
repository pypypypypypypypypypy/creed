const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const fetch = require('node-superfetch');

const HENTAI_ENDPOINTS = [
  { url: 'https://purrbot.site/api/img/nsfw/fuck/gif', key: 'link' },
  { url: 'https://purrbot.site/api/img/nsfw/anal/gif', key: 'link' },
  { url: 'https://purrbot.site/api/img/nsfw/neko/gif', key: 'link' },
  { url: 'https://purrbot.site/api/img/nsfw/erofeet/gif', key: 'link' },
  { url: 'https://purrbot.site/api/img/nsfw/holo/gif', key: 'link' },
  { url: 'https://purrbot.site/api/img/nsfw/les/gif', key: 'link' },
  { url: 'https://purrbot.site/api/img/nsfw/pwankg/gif', key: 'link' },
  { url: 'https://purrbot.site/api/img/nsfw/solo/gif', key: 'link' },
  { url: 'https://purrbot.site/api/img/nsfw/threesome_fff/gif', key: 'link' },
  { url: 'https://purrbot.site/api/img/nsfw/threesome_ffm/gif', key: 'link' },
  { url: 'https://purrbot.site/api/img/nsfw/threesome_mmf/gif', key: 'link' },
  { url: 'https://purrbot.site/api/img/nsfw/yaoi/gif', key: 'link' },
  { url: 'https://purrbot.site/api/img/nsfw/yuri/gif', key: 'link' },
  { url: 'https://api.waifu.pics/nsfw/waifu', key: 'url' },
  { url: 'https://api.waifu.pics/nsfw/blowjob', key: 'url' },
  { url: 'https://api.waifu.pics/nsfw/neko', key: 'url' },
  { url: 'https://api.waifu.pics/nsfw/trap', key: 'url' },
  { url: 'https://api.waifu.pics/nsfw/anal', key: 'url' },
  { url: 'https://api.waifu.pics/nsfw/ero', key: 'url' },
  { url: 'https://api.waifu.pics/nsfw/hentai', key: 'url' },
  { url: 'https://api.waifu.pics/nsfw/milf', key: 'url' },
  { url: 'https://api.waifu.pics/nsfw/oral', key: 'url' },
  { url: 'https://api.waifu.pics/nsfw/paizuri', key: 'url' },
  { url: 'https://api.waifu.pics/nsfw/pwankg', key: 'url' },
  { url: 'https://api.waifu.pics/nsfw/yaoi', key: 'url' },
  { url: 'https://api.waifu.pics/nsfw/yuri', key: 'url' },
  { url: 'https://api.waifu.pics/nsfw/cum', key: 'url' },
  { url: 'https://api.waifu.pics/nsfw/femdom', key: 'url' },
  { url: 'https://api.waifu.pics/nsfw/random', key: 'url' },
];

async function getHentaiGif() {
  const shuffled = [...HENTAI_ENDPOINTS].sort(() => Math.random() - 0.5);
  for (const ep of shuffled) {
    try {
      const { body } = await fetch.get(ep.url);
      const val = body[ep.key];
      if (val) return val;
    } catch {}
  }
  return null;
}

module.exports = {
  category: 'roleplay',
  help: [
    {
      name: 'fuck',
      description: 'Perform the fuck roleplay action on a user',
      aliases: 'n/a',
      parameters: '[user]',
      information: 'n/a',
      usage: 'fuck [user]',
      example: 'fuck @user'
    }
  ],
  name: 'fuck',
  run: async (client, message, args) => {
    const target = message.mentions.members.first();
    if (!target) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Please **mention** a member.`)] });
    const gif = await getHentaiGif();
    const embed = new EmbedBuilder()
      .setColor(color)
      .setDescription(`**${message.member.displayName}** fucked **${target.displayName}** 🔞`);
    if (gif) embed.setImage(gif);
    message.channel.send({ embeds: [embed] });
  }
};

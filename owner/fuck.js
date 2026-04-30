const { EmbedBuilder } = require('discord.js');
const fetch = require('node-superfetch');
const { color } = require('../config.json');
const { canRunOwnerCmd } = require('../utils/owners');

// Anime-only NSFW gif sources, curated for ecchi/"high school dxd" energy.
// Each entry returns a direct media url discord can embed.
// We hit several in parallel and pick a random successful response so
// back-to-back uses don't repeat the same gif.
const GIF_SOURCES = [
  { name: 'purrbot/blowjob', url: 'https://purrbot.site/api/img/nsfw/blowjob/gif',  pick: (b) => b?.link },
  { name: 'purrbot/cum',     url: 'https://purrbot.site/api/img/nsfw/cum/gif',      pick: (b) => b?.link },
  { name: 'purrbot/anal',    url: 'https://purrbot.site/api/img/nsfw/anal/gif',     pick: (b) => b?.link },
  { name: 'purrbot/yuri',    url: 'https://purrbot.site/api/img/nsfw/yuri/gif',     pick: (b) => b?.link },
  { name: 'purrbot/fuck',    url: 'https://purrbot.site/api/img/nsfw/fuck/gif',     pick: (b) => b?.link },
  { name: 'nekos.life',      url: 'https://nekos.life/api/v2/img/nsfw_neko_gif',    pick: (b) => b?.url },
  { name: 'waifu.pics',      url: 'https://api.waifu.pics/nsfw/trump',              pick: (b) => b?.url },
];

const MEDIA_RE = /\.(gif|webp|mp4|mov|png|jpe?g)(\?|$)/i;

async function fetchOne(src) {
  try {
    const { body } = await fetch.get(src.url).timeout(4000);
    const url = src.pick(body);
    if (!url || typeof url !== 'string') return null;
    if (!/^https?:\/\//i.test(url)) return null;
    if (!MEDIA_RE.test(url)) return null;
    return { url, source: src.name };
  } catch {
    return null;
  }
}

async function fetchFuckGif() {
  // Race them all in parallel; collect successes; pick a random one.
  const results = (await Promise.all(GIF_SOURCES.map(fetchOne))).filter(Boolean);
  if (!results.length) return null;
  return results[Math.floor(Math.random() * results.length)];
}

const FLAVOR = [
  'absolutely rails',
  'pins down and goes feral on',
  'has their way with',
  'pounds the everloving soul out of',
  'puts in their place \u2014',
  'destroys',
  'wrecks',
  'breeds',
];

module.exports = {
  category: 'owner',
  help: [
    {
      name: 'fuck',
      description: 'Owner-only roleplay command with anime gifs.',
      aliases: 'n/a',
      parameters: '[user]',
      information: 'BOT_OWNER',
      usage: 'fuck [user]',
      example: 'fuck @user',
    },
  ],

  name: 'fuck',
  aliases: [],

  run: async (client, message, args) => {
    if (!canRunOwnerCmd(message.author.id, 'fuck')) return;

    const target = message.mentions.members.first()
      || (args[0] ? message.guild.members.cache.get(args[0].replace(/[^0-9]/g, '')) : null);

    if (!target) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Please **mention** a member.`)],
      });
    }

    if (target.id === message.author.id) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: You can't do that to yourself.`)],
      });
    }

    const gif = await fetchFuckGif();
    const verb = FLAVOR[Math.floor(Math.random() * FLAVOR.length)];

    const embed = new EmbedBuilder()
      .setColor(color)
      .setDescription(`**${message.member.displayName}** ${verb} **${target.displayName}**`);

    if (gif?.url) embed.setImage(gif.url);

    return message.channel.send({ embeds: [embed] });
  },
};

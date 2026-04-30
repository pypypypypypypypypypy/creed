const { EmbedBuilder } = require('discord.js');
const fetch = require('node-superfetch');
const { color } = require('../config.json');
const { canRunOwnerCmd } = require('../utils/owners');

// Curated NSFW-ish but discord-safe anime "fuck" gif sources, in priority
// order. waifu.pics nsfw/trump (rough/intimate hugging gifs) and otakugifs
// "lust" provide the most consistently in-character anime energy. nekos.life
// "spank" is kept as a last-resort fallback so the command never silently
// fails. All sources return urls discord embeds can render directly.
const GIF_SOURCES = [
  {
    name: 'waifu.pics',
    url: 'https://api.waifu.pics/nsfw/trump',
    parse: (b) => (b?.url ? { url: b.url, credit: null } : null),
  },
  {
    name: 'otakugifs',
    url: 'https://api.otakugifs.xyz/gif?reaction=lust&format=gif',
    parse: (b) => (b?.url ? { url: b.url, credit: null } : null),
  },
  {
    name: 'waifu.pics',
    url: 'https://api.waifu.pics/sfw/bonk',
    parse: (b) => (b?.url ? { url: b.url, credit: null } : null),
  },
  {
    name: 'nekos.life',
    url: 'https://nekos.life/api/v2/img/spank',
    parse: (b) => (b?.url ? { url: b.url, credit: null } : null),
  },
];

async function fetchFuckGif() {
  const ordered = [...GIF_SOURCES];
  // Lightly randomize so back-to-back runs don't always hit the same source.
  if (Math.random() < 0.4) ordered.push(ordered.shift());

  for (const src of ordered) {
    try {
      const { body } = await fetch.get(src.url);
      const result = src.parse(body);
      if (!result || !result.url) continue;
      if (/\.(gif|webp|mp4|png|jpe?g)(\?|$)/i.test(result.url) || result.url.startsWith('http')) {
        return { ...result, source: src.name };
      }
    } catch {
      /* try next */
    }
  }
  return null;
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
  category: 'owner',

  run: async (client, message, args) => {
    if (!canRunOwnerCmd(message.author.id, 'fuck')) return;

    const target = message.mentions.members.first()
      || (args[0] ? message.guild.members.cache.get(args[0].replace(/[^0-9]/g, '')) : null);

    if (!target) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(color)
            .setDescription(`${message.author}: Please **mention** a member.`),
        ],
      });
    }

    if (target.id === message.author.id) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(color)
            .setDescription(`${message.author}: You can't do that to yourself.`),
        ],
      });
    }

    const gif = await fetchFuckGif();
    const verb = FLAVOR[Math.floor(Math.random() * FLAVOR.length)];

    const embed = new EmbedBuilder()
      .setColor(color)
      .setDescription(`**${message.member.displayName}** ${verb} **${target.displayName}**`);

    if (gif?.url) embed.setImage(gif.url);
    if (gif?.credit) embed.setFooter({ text: `from ${gif.credit}` });

    return message.channel.send({ embeds: [embed] });
  },
};

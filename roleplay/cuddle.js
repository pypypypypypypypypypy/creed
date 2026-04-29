const { EmbedBuilder } = require('discord.js');
const fetch = require('node-superfetch');
const db = require('../db');
const { color, default_prefix } = require('../config.json');

// Curated anime cuddle-gif sources, in priority order.
// nekos.best is hand-picked + tagged with anime_name and has the highest hit
// rate for actual in-bed/intimate cuddling.
// otakugifs.xyz is a smaller curated set, also clean.
// waifu.pics stays as a last-resort fallback so the command never fails silent.
const GIF_SOURCES = [
  {
    name: 'nekos.best',
    url: 'https://nekos.best/api/v2/cuddle',
    parse: (b) => {
      const r = Array.isArray(b?.results) ? b.results[0] : null;
      return r ? { url: r.url, credit: r.anime_name || null } : null;
    },
  },
  {
    name: 'otakugifs',
    url: 'https://api.otakugifs.xyz/gif?reaction=cuddle&format=gif',
    parse: (b) => (b?.url ? { url: b.url, credit: null } : null),
  },
  {
    name: 'waifu.pics',
    url: 'https://api.waifu.pics/sfw/cuddle',
    parse: (b) => (b?.url ? { url: b.url, credit: null } : null),
  },
];

async function fetchCuddleGif() {
  // Roll the source order so we don't always hit nekos.best first — keeps
  // results varied across consecutive uses while still preferring it.
  const ordered = [...GIF_SOURCES];
  if (Math.random() < 0.35) ordered.push(ordered.shift()); // demote primary ~1/3

  for (const src of ordered) {
    try {
      const { body } = await fetch.get(src.url);
      const result = src.parse(body);
      if (!result || !result.url) continue;
      // Accept any image/animation URL; embeds render gif/webp/mp4/png/jpg.
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
  'curls up next to',
  'snuggles into',
  'pulls the blanket over',
  'wraps their arms around',
  'nuzzles against',
];

module.exports = {
  category: 'roleplay',
  help: [
    {
      name: 'cuddle',
      description: 'Cuddle a user with an anime cuddle gif',
      aliases: 'n/a',
      parameters: '[user]',
      information: 'n/a',
      usage: 'cuddle [user]',
      example: 'cuddle @user',
    },
  ],

  name: 'cuddle',
  run: async (client, message, args) => {
    if (!db.get(`roleplay_${message.guild.id}`)) {
      const prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(color)
            .setDescription(`${message.author}: Roleplay commands are **disabled**. An Administrator must run \`${prefix}roleplay enable\` first.`),
        ],
      });
    }

    const target = message.mentions.members.first();
    if (!target) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Please **mention** a member.`)],
      });
    }
    if (target.id === message.author.id) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: You can't cuddle yourself \u2014 grab a pillow.`)],
      });
    }

    const gif = await fetchCuddleGif();
    const verb = FLAVOR[Math.floor(Math.random() * FLAVOR.length)];
    const embed = new EmbedBuilder()
      .setColor(color)
      .setDescription(`**${message.member.displayName}** ${verb} **${target.displayName}** \uD83E\uDEC2`);

    if (gif?.url) embed.setImage(gif.url);
    if (gif?.credit) embed.setFooter({ text: `from ${gif.credit}` });

    message.channel.send({ embeds: [embed] });
  },
};

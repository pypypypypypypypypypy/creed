const { EmbedBuilder } = require('discord.js');
const fetch = require('node-superfetch');
const db = require('../db');
const { color, default_prefix } = require('../config.json');

// Sources that return actual animated anime cuddle gifs.
// Tried in order, first one that works wins.
const GIF_SOURCES = [
  { url: 'https://api.waifu.pics/sfw/cuddle', key: 'url' },
  { url: 'https://nekos.life/api/v2/img/cuddle', key: 'url' },
  { url: 'https://purrbot.site/api/img/sfw/cuddle/gif', key: 'link' },
];

async function fetchCuddleGif() {
  for (const src of GIF_SOURCES) {
    try {
      const { body } = await fetch.get(src.url);
      const link = body && body[src.key];
      if (link && /\.(gif|webp|mp4)(\?|$)/i.test(link)) return link;
      if (link) return link; // even non-.gif anime images are fine as fallback
    } catch { /* try next */ }
  }
  return null;
}

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
      example: 'cuddle @user'
    }
  ],

  name: 'cuddle',
  run: async (client, message, args) => {
    if (!db.get(`roleplay_${message.guild.id}`)) {
      const prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Roleplay commands are **disabled**. An Administrator must run \`${prefix}roleplay enable\` first.`)] });
    }

    const target = message.mentions.members.first();
    if (!target) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Please **mention** a member.`)] });

    const gif = await fetchCuddleGif();
    const embed = new EmbedBuilder()
      .setColor(color)
      .setDescription(`**${message.member.displayName}** cuddled **${target.displayName}** 🤗`)
      .setImage(gif || null);

    message.channel.send({ embeds: [embed] });
  }
};

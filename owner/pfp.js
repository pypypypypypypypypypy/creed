const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { canRunOwnerCmd } = require('../utils/owners');

const IMAGE_RE = /\.(png|jpe?g|gif|webp)(\?.*)?$/i;

module.exports = {
  category: 'owner',
  help: [
    {
      name: 'pfp',
      description: "Update the bot's profile picture. Attach an image (png, jpg, gif, or webp) — or pass a direct image URL.",
      aliases: 'setpfp, setavatar',
      parameters: '<attachment | url>',
      information: 'BOT_OWNER. Discord ratelimits avatar changes to ~2 per hour.',
      usage: 'pfp (attach image)',
      example: 'pfp',
    },
  ],

  name: 'pfp',
  aliases: ['setpfp', 'setavatar'],

  run: async (client, message, args) => {
    if (!canRunOwnerCmd(message.author.id, 'pfp')) return;

    let source = null;

    const att = message.attachments.find((a) => IMAGE_RE.test(a.name || '') || IMAGE_RE.test(a.url || ''));
    if (att) source = att.url;

    if (!source && args[0]) {
      const arg = args[0].trim();
      if (/^https?:\/\//i.test(arg)) source = arg;
    }

    if (!source) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('#efa23a')
            .setDescription(`${message.author}: Attach a **png / jpg / gif / webp** image (or pass a direct image URL) to update the bot's pfp.`),
        ],
      });
    }

    try {
      await client.user.setAvatar(source);
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('#2ecc71')
            .setDescription(`${message.author}: Updated **${client.user.username}**'s avatar.`)
            .setThumbnail(client.user.displayAvatarURL({ size: 512, extension: 'png', forceStatic: false })),
        ],
      });
    } catch (e) {
      const msg = (e && e.message) || 'unknown error';
      return message.channel.send({
        embeds: [
          new EmbedBuilder().setColor('#e74c3c').setDescription(`Failed to update avatar: \`${msg}\``),
        ],
      });
    }
  },
};

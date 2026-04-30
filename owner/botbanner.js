const { EmbedBuilder } = require('discord.js');
const { canRunOwnerCmd } = require('../utils/owners');

const IMAGE_RE = /\.(png|jpe?g|gif|webp)(\?.*)?$/i;
const RESET_WORDS = new Set(['remove', 'reset', 'clear', 'none', 'off']);

module.exports = {
  category: 'owner',
  help: [
    {
      name: 'botbanner',
      description: "Update the bot's profile banner. Attach an image (png, jpg, gif, or webp), pass a direct image URL, or use `remove` to clear it.",
      aliases: 'setbotbanner, banner',
      parameters: '<attachment | url | remove>',
      information: 'BOT_OWNER. Banner upload requires the bot account to have a banner slot (Nitro / Verified). Discord ratelimits banner changes.',
      usage: 'botbanner (attach image)',
      example: 'botbanner',
    },
  ],

  name: 'botbanner',
  aliases: ['setbotbanner'],

  run: async (client, message, args) => {
    if (!canRunOwnerCmd(message.author.id, 'botbanner')) return;

    const first = (args[0] || '').toLowerCase().trim();
    const wantsReset = RESET_WORDS.has(first);

    let source = null;
    if (!wantsReset) {
      const att = message.attachments.find((a) => IMAGE_RE.test(a.name || '') || IMAGE_RE.test(a.url || ''));
      if (att) source = att.url;

      if (!source && args[0]) {
        const arg = args[0].trim();
        if (/^https?:\/\//i.test(arg)) source = arg;
      }
    }

    if (!wantsReset && !source) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('#FFFFFF')
            .setDescription(`${message.author}: Attach a **png / jpg / gif / webp** image, pass a direct image URL, or use \`,botbanner remove\` to clear it.`),
        ],
      });
    }

    try {
      await client.user.setBanner(wantsReset ? null : source);

      const action = wantsReset ? 'Cleared' : 'Updated';
      const embed = new EmbedBuilder()
        .setColor('#FFFFFF')
        .setDescription(`${message.author}: ${action} **${client.user.username}**'s banner.`);

      if (!wantsReset) {
        const fresh = await client.user.fetch(true).catch(() => client.user);
        const bannerUrl = fresh.bannerURL?.({ size: 1024, extension: 'png', forceStatic: false });
        if (bannerUrl) embed.setImage(bannerUrl);
      }

      return message.channel.send({ embeds: [embed] });
    } catch (e) {
      const msg = (e && e.message) || 'unknown error';
      return message.channel.send({
        embeds: [
          new EmbedBuilder().setColor('#FFFFFF').setDescription(`Failed to update banner: \`${msg}\``),
        ],
      });
    }
  },
};

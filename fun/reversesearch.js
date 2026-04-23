const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');

module.exports = {
  category: 'fun',
  help: [
    {
        name: 'reversesearch',
        description: 'Reverse image search a URL or attachment',
        aliases: 'reverse',
        parameters: '(image/url)',
        information: 'n/a',
        usage: 'reversesearch (image/url)',
        example: 'reversesearch image/url'
    }
],

    name: 'reversesearch',
  aliases: ['reverseimage', 'imagesearch'],
  category: 'fun',

  run: async (client, message, args) => {
    const helpEmbed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle('Command: reversesearch')
      .setDescription('Reverse search an image using Google, TinEye, and Yandex.')
      .addFields(
        { name: '**Aliases**', value: 'rs, reverseimage, imagesearch', inline: true },
        { name: '**Parameters**', value: '[image url or attachment]', inline: true },
        { name: '**Information**', value: 'Attach an image or provide a URL', inline: true },
        { name: '**Usage**', value: '```Syntax: ,reversesearch [image url]\nExample: ,reversesearch https://example.com/image.png```' }
      )
      .setFooter({ text: 'Module: fun' })
      .setTimestamp()
      .setColor(color);

    let imageUrl = null;

    if (message.attachments.size > 0) {
      const attachment = message.attachments.first();
      if (attachment.contentType?.startsWith('image/')) {
        imageUrl = attachment.url;
      }
    }

    if (!imageUrl && args[0]) {
      const urlPattern = /https?:\/\/[^\s]+\.(png|jpg|jpeg|gif|webp|bmp)(\?[^\s]*)?/i;
      if (urlPattern.test(args[0])) {
        imageUrl = args[0];
      }
    }

    if (!imageUrl) {
      const ref = message.reference;
      if (ref) {
        try {
          const refMsg = await message.channel.messages.fetch(ref.messageId);
          if (refMsg.attachments.size > 0) {
            const att = refMsg.attachments.first();
            if (att.contentType?.startsWith('image/')) imageUrl = att.url;
          }
          if (!imageUrl && refMsg.embeds.length > 0 && refMsg.embeds[0].image) {
            imageUrl = refMsg.embeds[0].image.url;
          }
        } catch {}
      }
    }

    if (!imageUrl) return message.channel.send({ embeds: [helpEmbed] });

    const encoded = encodeURIComponent(imageUrl);
    const googleUrl = `https://www.google.com/searchbyimage?image_url=${encoded}`;
    const tineyeUrl = `https://www.tineye.com/search?url=${encoded}`;
    const yandexUrl = `https://yandex.com/images/search?url=${encoded}&rpt=imageview`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('Google').setStyle(ButtonStyle.Link).setURL(googleUrl).setEmoji('🔍'),
      new ButtonBuilder().setLabel('TinEye').setStyle(ButtonStyle.Link).setURL(tineyeUrl).setEmoji('👁️'),
      new ButtonBuilder().setLabel('Yandex').setStyle(ButtonStyle.Link).setURL(yandexUrl).setEmoji('🌐')
    );

    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle('Reverse Image Search')
      .setDescription('Click one of the buttons below to reverse search this image.')
      .setImage(imageUrl)
      .setFooter({ text: 'Reverse Image Search • Google, TinEye, Yandex' })
      .setTimestamp();

    message.channel.send({ embeds: [embed], components: [row] });
  }
};

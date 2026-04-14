const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'createembed',
        description: 'Send a custom embed from JSON',
        aliases: 'ce',
        parameters: '(json)',
        information: 'MANAGE_MESSAGES',
        usage: 'createembed (json)',
        example: 'createembed json'
    }
],

    name: 'createembed',
  aliases: ['ce', 'embed'],

  run: async (client, message, args) => {
    const ceEmbed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle('Command: createembed')
      .setDescription('Create your own embed using a JSON script.\n**Supported fields:** title, description, color, url, thumbnail, image, author, footer, timestamp, fields')
      .addFields(
        { name: '**Aliases**', value: 'ce, embed', inline: true },
        { name: '**Parameters**', value: '[code]', inline: true },
        { name: '**Information**', value: 'N/A', inline: true },
        { name: '**Usage**', value: '```Syntax: createembed <embed json>\nExample: createembed {"title":"Hello","description":"World","color":"#ff0000"}```' }
      )
      .setFooter({ text: 'Module: utility' })
      .setTimestamp()
      .setColor(color);

    if (!args[0]) return message.channel.send({ embeds: [ceEmbed] });

    try {
      const json = JSON.parse(args.join(' '));
      const { text, content: msgContent, ...embedData } = json;
      const embed = new EmbedBuilder();

      if (embedData.title) embed.setTitle(embedData.title);
      if (embedData.description) embed.setDescription(embedData.description);
      if (embedData.color) embed.setColor(embedData.color);
      if (embedData.url) embed.setURL(embedData.url);
      if (embedData.timestamp) embed.setTimestamp(embedData.timestamp === true ? Date.now() : new Date(embedData.timestamp));

      if (embedData.thumbnail) {
        const thumbUrl = typeof embedData.thumbnail === 'string' ? embedData.thumbnail : embedData.thumbnail?.url;
        if (thumbUrl) embed.setThumbnail(thumbUrl);
      }
      if (embedData.image) {
        const imgUrl = typeof embedData.image === 'string' ? embedData.image : embedData.image?.url;
        if (imgUrl) embed.setImage(imgUrl);
      }
      if (embedData.author) embed.setAuthor({ name: embedData.author.name || 'Author', iconURL: embedData.author.icon_url, url: embedData.author.url });
      if (embedData.footer) embed.setFooter({ text: embedData.footer.text || '', iconURL: embedData.footer.icon_url });
      if (Array.isArray(embedData.fields)) {
        embed.addFields(embedData.fields.map(f => ({ name: f.name || '\u200b', value: f.value || '\u200b', inline: !!f.inline })));
      }

      await message.channel.send({ content: text || msgContent || undefined, embeds: [embed] });
    } catch (e) {
      message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: ${e.message}`)] });
    }
  },
};
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'copyembed',
        description: 'Copy the embed JSON from a message',
        aliases: 'n/a',
        parameters: '(message link)',
        information: 'n/a',
        usage: 'copyembed (message link)',
        example: 'copyembed message link'
    }
],

    name: 'copyembed',
  aliases: ['ce-copy'],

  run: async (client, message, args) => {
    const helpEmbed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle('Command: copyembed')
      .setDescription('Copy a message as a createembed script (embeds and Components v2).')
      .addFields(
        { name: '**Aliases**', value: 'ce-copy', inline: true },
        { name: '**Parameters**', value: '[message link]', inline: true },
        { name: '**Information**', value: 'N/A', inline: true },
        { name: '**Usage**', value: '```Syntax: copyembed <message link>\nExample: copyembed https://discord.com/channels/...```' }
      )
      .setFooter({ text: 'Module: utility' })
      .setTimestamp()
      .setColor(color);

    if (!args[0]) return message.channel.send({ embeds: [helpEmbed] });

    const linkRegex = /https?:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/channels\/(\d+)\/(\d+)\/(\d+)/;
    const match = args[0].match(linkRegex);
    if (!match) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: That doesn't look like a valid message link.`)] });
    }

    const [, guildId, channelId, messageId] = match;

    try {
      const targetChannel = client.channels.cache.get(channelId) || await client.channels.fetch(channelId).catch(() => null);
      if (!targetChannel) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I couldn't find that channel.`)] });
      }

      const targetMessage = await targetChannel.messages.fetch(messageId).catch(() => null);
      if (!targetMessage) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I couldn't find that message.`)] });
      }

      const result = { content: targetMessage.content || undefined, embeds: [] };

      for (const embed of targetMessage.embeds) {
        const embedData = {};
        if (embed.title) embedData.title = embed.title;
        if (embed.description) embedData.description = embed.description;
        if (embed.color) embedData.color = embed.color;
        if (embed.url) embedData.url = embed.url;
        if (embed.author) embedData.author = { name: embed.author.name, icon_url: embed.author.iconURL, url: embed.author.url };
        if (embed.thumbnail) embedData.thumbnail = embed.thumbnail.url;
        if (embed.image) embedData.image = embed.image.url;
        if (embed.footer) embedData.footer = { text: embed.footer.text, icon_url: embed.footer.iconURL };
        if (embed.timestamp) embedData.timestamp = embed.timestamp;
        if (embed.fields && embed.fields.length) embedData.fields = embed.fields.map(f => ({ name: f.name, value: f.value, inline: f.inline }));
        result.embeds.push(embedData);
      }

      const json = JSON.stringify(result, null, 2);
      const chunks = json.match(/.{1,1900}/gs) || [json];

      for (const chunk of chunks) {
        await message.channel.send({ content: `\`\`\`json\n${chunk}\n\`\`\`` });
      }

      await message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Copied the message embed script above.`)] });
    } catch (e) {
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: ${e.message}`)] });
    }
  },
};

const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'message',
  help: [
    {
      name: 'quotemsg',
      description: 'Quote a message in an embed by ID or link (or reply to a message)',
      aliases: 'qm',
      parameters: '(message id or link)',
      information: 'n/a',
      usage: 'quotemsg (message id or link)',
      example: 'quotemsg 123456789012345678'
    }
  ],

  name: 'quotemsg',
  aliases: ['qm'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    // Reply mode — quote the replied-to message
    if (message.reference && message.reference.messageId) {
      const ref = message.reference;
      const chan = message.guild.channels.cache.get(ref.channelId) || message.channel;
      const msg = await chan.messages.fetch(ref.messageId).catch(() => null);
      if (!msg) return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Could not fetch the replied message.`)]
      });

      const embed = new EmbedBuilder()
        .setColor(color)
        .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL({ forceStatic: false }) })
        .setDescription(msg.content || (msg.embeds[0]?.description) || '*No text content*')
        .addFields({ name: 'Source', value: `[Jump to message](${msg.url})`, inline: true })
        .setFooter({ text: `Quoted by ${message.author.tag}` })
        .setTimestamp(msg.createdTimestamp);

      await message.delete().catch(() => {});
      return message.channel.send({ embeds: [embed] });
    }

    if (!args[0]) return message.channel.send({
      embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(
        `${warn} ${message.author}: Reply to a message, or provide a message ID or link.\n\`\`\`\nSyntax: ${prefix}quotemsg <message id or link>\n\`\`\``
      )]
    });

    // Parse message link: https://discord.com/channels/guildId/channelId/messageId
    let channelId = message.channel.id;
    let messageId = args[0];
    const linkMatch = args[0].match(/channels\/\d+\/(\d+)\/(\d+)/);
    if (linkMatch) {
      channelId = linkMatch[1];
      messageId = linkMatch[2];
    }

    const chan = message.guild.channels.cache.get(channelId) || message.channel;
    const msg = await chan.messages.fetch(messageId).catch(() => null);

    if (!msg) return message.channel.send({
      embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(
        `${warn} ${message.author}: Message not found. Make sure the ID or link is correct and the bot can see that channel.`
      )]
    });

    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL({ forceStatic: false }) })
      .setDescription(msg.content || (msg.embeds[0]?.description) || '*No text content*')
      .addFields({ name: 'Source', value: `[Jump to message](${msg.url})`, inline: true })
      .setFooter({ text: `Quoted by ${message.author.tag}` })
      .setTimestamp(msg.createdTimestamp);

    await message.delete().catch(() => {});
    message.channel.send({ embeds: [embed] });
  }
};

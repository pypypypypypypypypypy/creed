const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'message',
  help: [
    {
        name: 'quote',
        description: 'Quote a message in an embed',
        aliases: 'n/a',
        parameters: '(message link)',
        information: 'n/a',
        usage: 'quote (message link)',
        example: 'quote message link'
    }
],

    name: 'quote',

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!args[0]) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}quote <message id>\``)] });

    const msg = await message.channel.messages.fetch(args[0]).catch(() => null);
    if (!msg) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Message not found in this channel.`)] });

    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL({ forceStatic: false }) })
      .setDescription(msg.content || '*No text content*')
      .addFields({ name: 'Source', value: `[Jump to message](${msg.url})`, inline: true })
      .setFooter({ text: `Quoted by ${message.author.tag}` })
      .setTimestamp(msg.createdTimestamp);

    await message.delete().catch(() => {});
    message.channel.send({ embeds: [embed] });
  }
};

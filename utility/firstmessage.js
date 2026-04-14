const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'firstmessage',
        description: 'Jump to the first message in a channel',
        aliases: 'firstmsg',
        parameters: '[channel]',
        information: 'n/a',
        usage: 'firstmessage [channel]',
        example: 'firstmessage channel'
    }
],

    name: 'firstmessage',
  aliases: ['firstmsg'],

  run: async (client, message, args) => {
    let mentionedMember = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!mentionedMember) mentionedMember = message.member;

    const fetchMessages = await message.channel.messages.fetch({ after: 1, limit: 1 });
    const msg = fetchMessages.first();
    if (!msg) return message.channel.send('Could not find the first message in this channel.');

    const embed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL({ forceStatic: false, size: 2048 }) })
      .setTitle(`First Message in #${message.channel.name}`)
      .setColor(mentionedMember.displayHexColor || color)
      .setURL(msg.url)
      .setThumbnail(msg.author.displayAvatarURL({ forceStatic: false, size: 2048 }))
      .setDescription('**Content:** ' + (msg.content || '*No text content*'))
      .addFields(
        { name: '**Author**', value: `<@${msg.author.id}>`, inline: true },
        { name: '**Message ID**', value: msg.id, inline: true },
        { name: '**Sent At**', value: msg.createdAt.toLocaleDateString(), inline: true }
      );

    message.channel.send({ embeds: [embed] });
  },
};

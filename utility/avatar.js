const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');

module.exports = {
  name: 'avatar',
  aliases: ['av'],
  category: 'utility',
  help: [
    { name: 'avatar', description: 'Get a user\'s avatar image', aliases: 'av', parameters: '[user]', information: 'n/a', usage: 'avatar [user]', example: 'avatar @user' },
  ],

  run: async (client, message, args) => {
    message.channel.sendTyping();

    let mentionedMember = message.mentions.members.first()
      || message.guild.members.cache.get(args[0])
      || message.guild.members.cache.find(r => r.user.username.toLowerCase() === args.join(' ').toLowerCase())
      || message.guild.members.cache.find(r => r.displayName.toLowerCase() === args.join(' ').toLowerCase())
      || message.member;

    const user = await client.users.fetch(mentionedMember.id).catch(() => null) || message.author;

    const embed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle(`${user.username}'s avatar`)
      .setURL(user.displayAvatarURL({ forceStatic: false, size: 2048 }))
      .setImage(user.displayAvatarURL({ forceStatic: false, size: 2048 }))
      .setColor(mentionedMember.displayHexColor || color);

    message.channel.send({ embeds: [embed] });
  }
};

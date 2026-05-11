const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');

module.exports = {
  name: 'avatar',
  aliases: ['av'],
  category: 'utility',
  help: [{ name: 'avatar', description: "Get a user's avatar", aliases: 'av', parameters: '[user]', information: 'n/a', usage: 'avatar [@user]', example: 'avatar @user' }],

  slashData: {
    name: 'avatar',
    description: "Get a user's avatar",
    dm_permission: true,
    options: [{ type: 6, name: 'user', description: 'User (default: you)', required: false }],
  },
  runSlash: async (client, interaction) => {
    const target = interaction.options.getUser('user') || interaction.user;
    const full = await client.users.fetch(target.id, { force: true }).catch(() => target);
    const url = full.displayAvatarURL({ forceStatic: false, size: 2048 });
    const embed = new EmbedBuilder()
      .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL({ forceStatic: false }) })
      .setTitle(`${full.username}'s avatar`).setURL(url).setImage(url)
      .setColor(color);
    await interaction.reply({ embeds: [embed] });
  },

  run: async (client, message, args) => {
    message.channel.sendTyping();
    let member = message.mentions.members?.first()
      || (args[0] ? message.guild?.members.cache.get(args[0]) : null)
      || message.member;
    const user = await client.users.fetch(member?.id || message.author.id, { force: true }).catch(() => message.author);
    const url = user.displayAvatarURL({ forceStatic: false, size: 2048 });
    const embed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle(`${user.username}'s avatar`).setURL(url).setImage(url)
      .setColor(member?.displayHexColor || color);
    message.channel.send({ embeds: [embed] });
  }
};

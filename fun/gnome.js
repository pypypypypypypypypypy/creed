const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js')
const Discord = { MessageEmbed: EmbedBuilder };
const { color } = require("../config.json");

module.exports = {
  category: 'fun',
  help: [
    {
        name: 'gnome',
        description: 'Gnome a user',
        aliases: 'n/a',
        parameters: '(user)',
        information: 'n/a',
        usage: 'gnome (user)',
        example: 'gnome user'
    }
],

    name: "gnome",

  run: async (client, message, args) => {
    const embed = new EmbedBuilder()
    .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
    .setTitle('Command: gnome')
    .setDescription('Gnome the mentioned user')
    .addFields({ name: '**Aliases**', value: 'N/A', inline: true })
    .addFields({ name: '**Parameters**', value: 'member', inline: true })
    .addFields({ name: '**Information**', value: `N/A`, inline: true })
    .addFields({ name: '**Usage**', value: '\`\`\`Syntax: gnome (member)\nExample: gnome four#0001\`\`\`' })
    .setFooter({ text: `Module: fun` })
    .setTimestamp()
    .setColor(color)
    if (!args[0]) return message.channel.send({ embeds: [embed] })

    message.delete();

    let user = message.mentions.users.first();

    message.channel.send(`${user} Ho ho ho ha ha, ho ho ho he ha. Hello there, old chum. I’m g'not a g'nelf. I’m g'not a g'noblin. I’m a g'nome!! And you’ve been, GNOOOMED!!!`);
  }
}
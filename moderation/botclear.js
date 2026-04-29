const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js')
const Discord = { MessageEmbed: EmbedBuilder };
const { approve } = require('../emojis.json')
const { warn } = require('../emojis.json')

/***
* @param {Discord.client} bot the discord bot client.
* @param {Discord.messsage} message the initial message sent by the user.
* @param {array} args an array of arguments
 */

module.exports = {
  category: 'moderation',
  help: [
    {
        name: 'botclear',
        description: 'Clear bot messages from a channel',
        aliases: 'bc',
        parameters: '[amount]',
        information: 'MANAGE_MESSAGES',
        usage: 'botclear [amount]',
        example: 'botclear amount'
    }
],

    name: "botclear",
  aliases: ["bc"],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_messages\``)] });
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`manage_messages\``)] });

    const messages = await message.channel.messages.fetch();
    const botMessages = messages.filter(msg => msg.author.bot);
    await message.channel.bulkDelete(botMessages, true);
    await message.delete().catch(() => {});

    let botClearEmbed = new EmbedBuilder()
      .setColor("#a3eb7b")
      .setDescription(`${approve} ${message.author}: Removed messages from **bots**`)
    message.channel.send({ embeds: [botClearEmbed] });
  }
}
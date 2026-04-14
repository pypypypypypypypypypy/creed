const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js')
const Discord = { MessageEmbed: EmbedBuilder };
const { color } = require("../config.json");
const { warn } = require('../emojis.json')
const { paginate } = require('../utils/paginate');
const db = require('../db');

module.exports = {
  category: 'moderation',
  help: [
    {
        name: 'purgeuser',
        description: 'Purge messages from a specific user',
        aliases: 'pu',
        parameters: '(user) [amount]',
        information: 'MANAGE_MESSAGES',
        usage: 'purgeuser (user) [amount]',
        example: 'purgeuser user amount'
    }
],

    name: "purgeuser",
  aliases: ["puser"],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.channel.send({ embeds: [new EmbedBuilder().setColor("efa23a").setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_messages\``)] });
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) return message.channel.send({ embeds: [new EmbedBuilder().setColor("efa23a").setDescription(`${warn} ${message.author}: I'm **missing** permission: \`manage_messages\``)] });
    const purgehelpEmbed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle('Command: purgeuser')
      .setDescription('Deletes the specified amount of messages from the mentioned user')
      .addFields({ name: '**Aliases**', value: 'puser', inline: true })
      .addFields({ name: '**Parameters**', value: 'member, amount', inline: true })
      .addFields({ name: '**Information**', value: `${warn} Manage Messages`, inline: true })
      .addFields({ name: '**Usage**', value: '\`\`\`Syntax: purgeuser (member) <amount>\nExample: purgeuser four#0001 30\`\`\`' })
      .setFooter({ text: `Module: moderation` })
      .setTimestamp()
      .setColor(color)
    if (!args[0]) {
      let prefix = db.get(`prefix_${message.guild.id}`);
      if (prefix === null) prefix = require('../config.json').default_prefix;
      return paginate(message, [
        { name: 'purgeuser', description: 'Delete a specified amount of messages from a user in the current channel', aliases: 'puser', parameters: '(member) (amount)', information: 'MANAGE_MESSAGES', usage: `${prefix}purgeuser (member) <amount>`, example: `${prefix}purgeuser @user 30` }
      ], 'moderation');
    }

    let member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    let amount = args[1]
    if (!member) return message.channel.send({ embeds: [new EmbedBuilder().setColor("efa23a").setDescription(`${warn} ${message.author}: You need to **mention** a user to purge`)] })
    if (!amount) return message.channel.send({ embeds: [new EmbedBuilder().setColor("efa23a").setDescription(`${warn} ${message.author}: Provide an **amount** to purge`)] })
    if (isNaN(amount)) return message.channel.send({ embeds: [new EmbedBuilder().setColor("efa23a").setDescription(`${warn} ${message.author}: You need to enter a **valid** amount to purge`)] })
    if (amount > 100) return message.channel.send({ embeds: [new EmbedBuilder().setColor("efa23a").setDescription(`${warn} ${message.author}: Invalid amount. Make sure it is between **2-100**`)] })
    let AllMessages = await message.channel.messages.fetch()
    let FilteredMessages = await AllMessages.filter(x => x.author.id === member.id)
    let deletedMessages = 0
    FilteredMessages.forEach(msg => {
      if (deletedMessages >= amount) return
      msg.delete()
      deletedMessages++
    })
  }
}
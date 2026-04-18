const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'mail',
        description: 'Send a DM to a user via the bot',
        aliases: 'dm, sendmail',
        parameters: '(user) (message)',
        information: 'n/a',
        usage: 'mail (user) (message)',
        example: 'mail user message'
    }
],

    name: 'mail',
  aliases: ['dm', 'sendmail'],
  category: 'utility',

  run: async (client, message, args) => {
    const prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're missing permission: \`manage_messages\``)] });

    if (!args[0]) {
      const embed = new EmbedBuilder()
        .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
        .setTitle('Command: mail')
        .setDescription('Send a direct message to a user on behalf of the server.')
        .addFields(
          { name: '**Aliases**', value: 'dm, sendmail', inline: true },
          { name: '**Parameters**', value: '<user> <message>', inline: true },
          { name: '**Information**', value: 'Requires Manage Messages', inline: true },
          { name: '**Usage**', value: `\`\`\`Syntax: ${prefix}mail <@user> <message>\nExample: ${prefix}mail @John Your application has been approved.\`\`\`` }
        )
        .setFooter({ text: 'Module: utility' })
        .setTimestamp()
        .setColor(color);
      return message.channel.send({ embeds: [embed] });
    }

    const target = message.mentions.members.first()
      || message.guild.members.cache.get(args[0])
      || message.guild.members.cache.find(m => m.user.username.toLowerCase() === args[0].toLowerCase());

    if (!target)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Could not find that user. Please mention them or provide their ID.`)] });

    const mailContent = args.slice(1).join(' ');
    if (!mailContent)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please provide a message to send.`)] });

    const mailEmbed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({ name: message.guild.name, iconURL: message.guild.iconURL({ forceStatic: false }) || undefined })
      .setTitle(`📬 Message from ${message.guild.name}`)
      .setDescription(mailContent)
      .setFooter({ text: `Sent by ${message.author.tag}` })
      .setTimestamp();

    try {
      await target.send({ embeds: [mailEmbed] });
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Your message has been sent to **${target.user.username}**.`)] });
    } catch {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${warn} ${message.author}: Could not send a DM to **${target.user.username}**. They may have DMs disabled.`)] });
    }
  }
};

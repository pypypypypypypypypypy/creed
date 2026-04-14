const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, PermissionFlagsBits } = require('discord.js');
const { color } = require("../config.json");
const { warn } = require('../emojis.json');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'poll',
        description: 'Create a poll with multiple options',
        aliases: 'createpoll',
        parameters: '(question) | (option1) | (option2) ...',
        information: 'n/a',
        usage: 'poll (question) | (option1) | (option2) ...',
        example: 'poll question |'
    }
],

    name: "poll",
  aliases: ["createpoll"],
  category: "utility",

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor("efa23a").setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_messages\``)] });
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.EmbedLinks))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor("efa23a").setDescription(`${warn} ${message.author}: I'm **missing** permission: \`embed_links\``)] });

    if (!args[0]) {
      const pollEmbed = new EmbedBuilder()
        .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL({ forceStatic: false }) })
        .setTitle('Command: poll')
        .setDescription('Create a poll')
        .addFields(
          { name: '**Aliases**', value: 'N/A', inline: true },
          { name: '**Parameters**', value: 'question', inline: true },
          { name: '**Information**', value: `${warn} Embed Links`, inline: true },
          { name: '**Usage**', value: '```Syntax: poll <question>\nExample: poll Am I gay?```' }
        )
        .setFooter({ text: 'Module: misc' })
        .setTimestamp()
        .setColor(color);
      return message.channel.send({ embeds: [pollEmbed] });
    }

    const question = args.slice(0).join(' ');
    const member = message.mentions.members.first() || message.member;

    const embed = new EmbedBuilder()
      .setColor(member.displayHexColor || color)
      .setTitle(`__**Poll**__`)
      .setDescription(question)
      .setAuthor({ name: `Poll created by: ${message.author.username}`, iconURL: message.author.displayAvatarURL({ forceStatic: false, size: 2048 }) })
      .setTimestamp()
      .setFooter({ text: message.guild.members.me.displayName });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('poll_yes')
        .setEmoji('👍')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('poll_no')
        .setEmoji('👎')
        .setStyle(ButtonStyle.Danger)
    );

    message.delete().catch(() => {});
    await message.channel.send({ embeds: [embed], components: [row] });
  }
};

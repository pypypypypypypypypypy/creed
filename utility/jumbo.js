const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js')
const Discord = { MessageEmbed: EmbedBuilder };
const { parse } = require("twemoji-parser");
const { color } = require("../config.json");
const { warn } = require('../emojis.json')

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'jumbo',
        description: 'Enlarge a custom emoji',
        aliases: 'e, enlarge, enlargen',
        parameters: '(emoji)',
        information: 'n/a',
        usage: 'jumbo (emoji)',
        example: 'jumbo emoji'
    }
],

      name: "jumbo",
    aliases: ["e", "enlarge", "enlargen"],

    run: async (client, message, args) => {
        let user = message.mentions.members.first() || message.guild.members.cache.get(args[0]) || message.member;

        const emoji = args[0];
        if (!args[0]) {
            const enlargeEmbed = new EmbedBuilder()
                .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
                .setTitle('Command: jumbo')
                .setDescription('Returns a large emoji or server emote')
                .addFields({ name: '**Aliases**', value: 'e, enlarge, enlargen', inline: true })
                .addFields({ name: '**Parameters**', value: 'emoji, characters', inline: true })
                .addFields({ name: '**Information**', value: `N/A`, inline: true })
                .addFields({ name: '**Usage**', value: '\`\`\`Syntax: jumbo <emoji or emote>\nExample: jumbo 🔥\`\`\`' })
                .setFooter({ text: `Module: misc` })
                .setTimestamp()
                .setColor(color)
            if (!args[0]) return message.channel.send({ embeds: [enlargeEmbed] })
        }
        let custom = Discord.Util.parseEmoji(emoji);
        const embed = new EmbedBuilder()
            .setColor(user.displayHexColor || color);

        if (custom.id) {
            embed.setImage(`https://cdn.discordapp.com/emojis/${custom.id}.${custom.animated ? "gif" : "png"}`);
            return message.channel.send({ embeds: [embed] });
        }
        else {
            let parsed = parse(emoji, { assetType: "png" });
            if (!parsed[0]) return message.channel.send({ embeds: [new EmbedBuilder().setColor("#efa23a").setDescription(`${warn} ${message.author}: You must input a **valid** emoji`)] });

            embed.setImage(parsed[0].url);
            return message.channel.send({ embeds: [embed] });
        }

    }
}
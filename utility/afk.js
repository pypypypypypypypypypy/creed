const db = require('../db');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js')
const Discord = { MessageEmbed: EmbedBuilder };
const emojis = require('../emojis.json');

module.exports = {
    name : 'afk',
    category: "utility",
    usage: "afk",
    help: [
      { name: 'afk', description: 'Set an AFK status when you are mentioned', aliases: 'n/a', parameters: '[reason]', information: 'n/a', usage: 'afk [reason]', example: 'afk eating lunch' },
    ],

    run : async(client, message, args) => {
        const content = args.join(" ") ? args.join(' ') : "AFK"
        await db.set(`afk-${message.author.id}+${message.guild.id}`, content)
        
        const afkEmbed = new EmbedBuilder()
        .setColor("#a3eb7b")
        .setDescription(`${emojis.approve} ${message.author}: You're now AFK with the status: **${content}**`)
        message.channel.send({ embeds: [afkEmbed] })                
    }
}
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js')
const db = require('../db')
const { default_prefix } = require("../config.json");
const { color } = require("../config.json");
const { approve } = require('../emojis.json')
const { warn } = require('../emojis.json')
const { paginate } = require('../utils/paginate');

module.exports = {
  name: "antiinvite",
  aliases: ["antilinks"],
  category: 'configuration',
  help: [
    { name: 'antiinvite', description: 'Manage Discord invite link blocking', aliases: 'antilinks', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'antiinvite', example: 'antiinvite' },
    { name: 'antiinvite enable', description: 'Block Discord invite links in the server', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'antiinvite enable', example: 'antiinvite enable' },
    { name: 'antiinvite disable', description: 'Allow Discord invite links in the server', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'antiinvite disable', example: 'antiinvite disable' },
  ],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`manage_messages\``)] });

    let prefix = db.get(`prefix_${message.guild.id}`);
    if (prefix === null) { prefix = default_prefix; }
    if (message.author.bot) return;

    if (!args[0]) {
      return paginate(message, [
        {
          name: 'antiinvite',
          description: 'Set up anti-invite to delete Discord invite links sent by members',
          aliases: 'antilinks',
          parameters: 'n/a',
          information: 'MANAGE_GUILD',
          usage: `${prefix}antiinvite`,
          example: `${prefix}antiinvite`
        },
        {
          name: 'antiinvite enable',
          description: 'Enable anti-invite for the guild',
          aliases: 'n/a',
          parameters: 'n/a',
          information: 'MANAGE_GUILD',
          usage: `${prefix}antiinvite enable`,
          example: `${prefix}antiinvite enable`
        },
        {
          name: 'antiinvite disable',
          description: 'Disable anti-invite for the guild',
          aliases: 'n/a',
          parameters: 'n/a',
          information: 'MANAGE_GUILD',
          usage: `${prefix}antiinvite disable`,
          example: `${prefix}antiinvite disable`
        }
      ], 'configuration');
    }

    const antilinks = args[0]
    if (!antilinks || (antilinks !== "enable" && antilinks !== "disable")) {

      if (antilinks === "enable") {
        db.set(`antilink_${message.guild.id}`, 'on')

        const embed_on = new EmbedBuilder()
          .setColor(`#a3eb7b`)
          .setDescription(`${approve} ${message.author}: Antiinvite is now **enabled**`)

        message.channel.send({ embeds: [embed_on] })

      } else if (antilinks === "disable") {
        db.set(`antilink_${message.guild.id}`, 'off')

        const embed_off = new EmbedBuilder()
          .setColor(`#a3eb7b`)
          .setDescription(`${approve} ${message.author}: Successfully **disabled** antiinvite for this guild`)

        message.channel.send({ embeds: [embed_off] })
      }
    }
  }
}
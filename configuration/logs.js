const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js')
const Discord = { MessageEmbed: EmbedBuilder };
const db = require('../db');
const { default_prefix } = require("../config.json");
const { color } = require("../config.json");
const { approve, warn } = require('../emojis.json');
const { paginate } = require('../utils/paginate');

module.exports = {
  name: "logs",
  aliases: ['modlogs'],
  category: 'configuration',
  help: [
    { name: 'logs', description: 'Manage the moderation logs channel', aliases: 'modlogs', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'logs', example: 'logs' },
    { name: 'logs channel', description: 'Set the moderation logs channel', aliases: 'n/a', parameters: '(channel)', information: 'MANAGE_GUILD', usage: 'logs channel #channel', example: 'logs channel #mod-logs' },
    { name: 'logs clear', description: 'Remove the moderation logs channel', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'logs clear', example: 'logs clear' },
  ],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.channel.send({ embeds: [new EmbedBuilder().setColor("efa23a").setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });

    let prefix = db.get(`prefix_${message.guild.id}`);
    if (prefix === null) prefix = default_prefix;

    if (!args[0]) {
      return paginate(message, [
        {
          name: 'logs',
          description: 'Set up a channel to log moderation actions in your server',
          aliases: 'modlogs',
          parameters: 'n/a',
          information: 'MANAGE_GUILD',
          usage: `${prefix}logs`,
          example: `${prefix}logs`
        },
        {
          name: 'logs channel',
          description: 'Set the channel where moderation logs are sent',
          aliases: 'n/a',
          parameters: '(channel)',
          information: 'MANAGE_GUILD',
          usage: `${prefix}logs channel #channel`,
          example: `${prefix}logs channel #mod-logs`
        },
        {
          name: 'logs clear',
          description: 'Remove the current modlogs channel',
          aliases: 'n/a',
          parameters: 'n/a',
          information: 'MANAGE_GUILD',
          usage: `${prefix}logs clear`,
          example: `${prefix}logs clear`
        }
      ], 'configuration');
    }

    if (args[0] === 'clear') {
      db.delete(`logschannel_${message.guild.id}`);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor("#a3eb7b").setDescription(`${approve} ${message.author}: The **modlogs channel** has been removed`)] });
    }

    if (args[0] === 'channel') {
      let channel = message.mentions.channels.first();
      if (!channel) return message.channel.send({ embed: { color: "#efa23a", description: `${warn} ${message.author}: Please mention a channel — \`${prefix}logs channel #channel\`` } });
      db.set(`logschannel_${message.guild.id}`, channel.id);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor("#a3eb7b").setDescription(`${approve} ${message.author}: Set the **modlogs channel** to ${channel}`)] });
    }
  }
};

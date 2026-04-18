const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { default_prefix, color } = require("../config.json");
const { approve, warn } = require('../emojis.json');
const { paginate } = require('../utils/paginate');

module.exports = {
  name: "welcome",
  aliases: ['welc', 'wlc'],
  category: 'configuration',
  help: [
    { name: 'welcome', description: 'Set up a welcome message when new members join', aliases: 'welc, wlc', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'welcome', example: 'welcome' },
    { name: 'welcome channel', description: 'Set the channel where welcome messages are sent', aliases: 'c, chan', parameters: '(channel)', information: 'MANAGE_GUILD', usage: 'welcome channel #channel', example: 'welcome channel #welcome' },
    { name: 'welcome clear', description: 'Clear the welcome channel and message', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'welcome clear', example: 'welcome clear' },
    { name: 'welcome message', description: 'Set the text sent when a new member joins', aliases: 'msg', parameters: '(message)', information: 'MANAGE_GUILD', usage: 'welcome message (text)', example: 'welcome message Welcome {user} to {guild.name}!' },
    { name: 'welcome variables', description: 'See all available welcome message variables', aliases: 'vars', parameters: 'n/a', information: 'n/a', usage: 'welcome variables', example: 'welcome variables' },
    { name: 'welcome test', description: 'Test your welcome message in the set channel', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'welcome test', example: 'welcome test' },
  ],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });

    let prefix = db.get(`prefix_${message.guild.id}`);
    if (prefix === null) prefix = default_prefix;

    if (!args[0]) {
      return paginate(message, [
        {
          name: 'welcome',
          description: 'Set up a welcome message when new members join',
          aliases: 'welc, wlc',
          parameters: 'n/a',
          information: 'MANAGE_GUILD',
          usage: `${prefix}welcome`,
          example: `${prefix}welcome`
        },
        {
          name: 'welcome channel',
          description: 'Set the channel where welcome messages are sent',
          aliases: 'c, chan',
          parameters: '(channel)',
          information: 'MANAGE_GUILD',
          usage: `${prefix}welcome channel #channel`,
          example: `${prefix}welcome channel #welcome`
        },
        {
          name: 'welcome clear',
          description: 'Clear the welcome channel and message',
          aliases: 'n/a',
          parameters: 'n/a',
          information: 'MANAGE_GUILD',
          usage: `${prefix}welcome clear`,
          example: `${prefix}welcome clear`
        },
        {
          name: 'welcome message',
          description: 'Set the text sent when a new member joins',
          aliases: 'msg',
          parameters: '(message)',
          information: 'MANAGE_GUILD',
          usage: `${prefix}welcome message (text)`,
          example: `${prefix}welcome message Welcome {user} to {guild.name}!`
        },
        {
          name: 'welcome variables',
          description: 'See all available welcome message variables',
          aliases: 'vars',
          parameters: 'n/a',
          information: 'n/a',
          usage: `${prefix}welcome variables`,
          example: `${prefix}welcome variables`
        },
        {
          name: 'welcome test',
          description: 'Test your welcome message in the set channel',
          aliases: 'n/a',
          parameters: 'n/a',
          information: 'MANAGE_GUILD',
          usage: `${prefix}welcome test`,
          example: `${prefix}welcome test`
        }
      ], 'configuration');
    }

    if (['add', 'create', 'set'].includes(args[0].toLowerCase())) {
      const channel = message.mentions.channels.first();
      const text = args.slice(channel ? 2 : 1).join(' ');
      if (channel) db.set(`welchannel_${message.guild.id}`, channel.id);
      if (text) db.set(`welmessage_${message.guild.id}`, text);
      if (!channel && !text) return message.channel.send({ embeds: [new EmbedBuilder().setColor("#efa23a").setDescription(`${warn} ${message.author}: Usage: \`${prefix}welcome add #channel <message>\``)] });
      return message.channel.send({ embeds: [new EmbedBuilder().setColor("#a3eb7b").setDescription(`${approve} ${message.author}: Welcome configuration saved.`)] });
    }

    if (['list', 'view', 'check'].includes(args[0].toLowerCase())) {
      const chx = db.get(`welchannel_${message.guild.id}`);
      const msg = db.get(`welmessage_${message.guild.id}`);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Welcome Configuration').addFields(
        { name: 'Channel', value: chx ? `<#${chx}>` : 'Not set', inline: true },
        { name: 'Message', value: msg || 'Not set' }
      )] });
    }

    if (args[0].toLowerCase() === 'message' || args[0].toLowerCase() === 'msg') {
      db.set(`welmessage_${message.guild.id}`, args.slice(1).join(' '));
      let wlcmsg = db.get(`welmessage_${message.guild.id}`);
      if (!wlcmsg) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor("#efa23a").setDescription(`${warn} ${message.author}: There is no **welcome message** — set one with \`${prefix}welcome message\``)] });
      }
      return message.channel.send({ embeds: [new EmbedBuilder().setColor("#a3eb7b").setDescription(`${approve} ${message.author}: Welcome message set to:\n\`\`\`${wlcmsg}\`\`\``)] });
    }

    if (args[0].toLowerCase() === 'test') {
      let chx = db.get(`welchannel_${message.guild.id}`);
      if (!chx) return message.channel.send({ embeds: [new EmbedBuilder().setColor("#efa23a").setDescription(`${warn} ${message.author}: There is no **welcome channel** set`)] });
      let welcome = db.get(`welmessage_${message.guild.id}`);
      if (!welcome) return message.channel.send({ embeds: [new EmbedBuilder().setColor("#efa23a").setDescription(`${warn} ${message.author}: There is no **welcome message** set`)] });
      const ordinal = n => n + (['st','nd','rd'][((n%100-11)%10-1)]||'th');
      welcome = welcome
        .replace('{user}', message.member)
        .replace('{user.name}', message.author.username)
        .replace('{user.tag}', message.author.tag)
        .replace('{user.id}', message.author.id)
        .replace('{membercount}', message.guild.memberCount)
        .replace('{membercount.ordinal}', ordinal(message.guild.memberCount))
        .replace('{guild.name}', message.guild.name)
        .replace('{guild.id}', message.guild.id);
      client.channels.cache.get(chx).send(welcome);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor("#a3eb7b").setDescription(`${approve} ${message.author}: Successfully tested your **welcome message** in <#${chx}>`)] });
    }

    if (args[0].toLowerCase() === 'variables' || args[0].toLowerCase() === 'vars') {
      const ordinal = n => n + (['st','nd','rd'][((n%100-11)%10-1)]||'th');
      return message.channel.send({ embeds: [new EmbedBuilder()
        .setColor(color)
        .setTitle('Welcome Variables')
        .setDescription(
          `\`{user}\` ＊ ${message.author}\n` +
          `\`{user.name}\` ＊ ${message.author.username}\n` +
          `\`{user.tag}\` ＊ ${message.author.tag}\n` +
          `\`{user.id}\` ＊ ${message.author.id}\n` +
          `\`{guild.name}\` ＊ ${message.guild.name}\n` +
          `\`{guild.id}\` ＊ ${message.guild.id}\n` +
          `\`{membercount}\` ＊ ${message.guild.memberCount}\n` +
          `\`{membercount.ordinal}\` ＊ ${ordinal(message.guild.memberCount)}`
        )] });
    }

    if (['channel', 'chan', 'c'].includes(args[0].toLowerCase())) {
      let channel = message.mentions.channels.first();
      if (!channel) return message.channel.send({ embeds: [new EmbedBuilder().setColor("#efa23a").setDescription(`${warn} ${message.author}: Please mention a channel — \`${prefix}welcome channel #channel\``)] });
      db.set(`welchannel_${message.guild.id}`, channel.id);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor("#a3eb7b").setDescription(`${approve} ${message.author}: Set the **welcome channel** to ${channel}`)] });
    }

    if (['clear', 'remove', 'delete', 'del'].includes(args[0].toLowerCase())) {
      db.delete(`welchannel_${message.guild.id}`);
      db.delete(`welmessage_${message.guild.id}`);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor("#a3eb7b").setDescription(`${approve} ${message.author}: Successfully cleared the **welcome channel** & **message**`)] });
    }
  }
};

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { default_prefix } = require("../config.json");
const { color } = require("../config.json");
const { approve } = require('../emojis.json');
const { warn } = require('../emojis.json');
const { paginate } = require('../utils/paginate');

module.exports = {
  name: "joindm",
  aliases: ['jdm', 'welcomedm'],
  category: 'configuration',
  help: [
    { name: 'joindm', description: 'Manage the DM sent to new members on join', aliases: 'jdm, welcomedm', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'joindm', example: 'joindm' },
    { name: 'joindm message', description: 'Set the DM message sent to new members', aliases: 'msg', parameters: '(message)', information: 'MANAGE_GUILD', usage: 'joindm message (text)', example: 'joindm message Welcome to the server!' },
    { name: 'joindm clear', description: 'Clear the join DM message', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'joindm clear', example: 'joindm clear' },
    { name: 'joindm test', description: 'Test your join DM message', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'joindm test', example: 'joindm test' },
  ],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`manage_messages\``)] });

    let prefix = db.get(`prefix_${message.guild.id}`);
    if (prefix === null) { prefix = default_prefix; }
    if (message.author.bot) return;
    const sub = args[0];

    if (!sub) {
      return paginate(message, [
        {
          name: 'joindm',
          description: 'Set up a DM message sent to new members when they join',
          aliases: 'jdm, welcomedm',
          parameters: 'n/a',
          information: 'MANAGE_GUILD',
          usage: `${prefix}joindm`,
          example: `${prefix}joindm`
        },
        {
          name: 'joindm message',
          description: 'Set the text that gets DM\'d to new members',
          aliases: 'n/a',
          parameters: '(message)',
          information: 'MANAGE_GUILD',
          usage: `${prefix}joindm message (text)`,
          example: `${prefix}joindm message Welcome to the server!`
        },
        {
          name: 'joindm clear',
          description: 'Clear the join DM message',
          aliases: 'n/a',
          parameters: 'n/a',
          information: 'MANAGE_GUILD',
          usage: `${prefix}joindm clear`,
          example: `${prefix}joindm clear`
        },
        {
          name: 'joindm test',
          description: 'Test how the join DM message will look',
          aliases: 'n/a',
          parameters: 'n/a',
          information: 'MANAGE_GUILD',
          usage: `${prefix}joindm test`,
          example: `${prefix}joindm test`
        }
      ], 'configuration');
    }

    if (sub === 'message') {
      const msg = args.slice(1).join(" ");
      if (!msg) return message.channel.send({ embeds: [new EmbedBuilder().setColor("#efa23a").setDescription(`${warn} ${message.author}: You need to provide a **join message**`)] });
      db.set(`joindm_${message.guild.id}`, msg);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Successfully set your **joindm message**`)] });
    }

    if (sub === 'clear') {
      const existing = db.get(`joindm_${message.guild.id}`);
      if (!existing) return message.channel.send({ embeds: [new EmbedBuilder().setColor("#efa23a").setDescription(`${warn} ${message.author}: There is no **joindm message** set for me to clear this`)] });
      db.delete(`joindm_${message.guild.id}`);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor("#a3eb7b").setDescription(`${approve} ${message.author}: Successfully cleared the **joindm message**`)] });
    }

    if (sub === 'test') {
      const savedMsg = db.get(`joindm_${message.guild.id}`);
      if (!savedMsg) return message.channel.send({ embeds: [new EmbedBuilder().setColor("#efa23a").setDescription(`${warn} ${message.author}: There is no **joindm message** set for me to test this`)] });
      return message.channel.send({ content: savedMsg });
    }
  }
};

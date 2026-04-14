const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { default_prefix, color } = require('../config.json');
const { warn, deny, approve } = require('../emojis.json');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'vanitysniper',
        description: 'Manage vanity URL sniping',
        aliases: 'vs',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'vanitysniper',
        example: 'vanitysniper'
    },
    {
        name: 'vanitysniper add',
        description: 'Add a vanity to snipe',
        aliases: 'n/a',
        parameters: '(vanity)',
        information: 'MANAGE_GUILD',
        usage: 'vanitysniper add (vanity)',
        example: 'vanitysniper add vanity'
    },
    {
        name: 'vanitysniper remove',
        description: 'Remove a vanity from the snipe list',
        aliases: 'n/a',
        parameters: '(vanity)',
        information: 'MANAGE_GUILD',
        usage: 'vanitysniper remove (vanity)',
        example: 'vanitysniper remove vanity'
    },
    {
        name: 'vanitysniper list',
        description: 'List sniped vanities',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'vanitysniper list',
        example: 'vanitysniper list'
    }
],

    name: 'vanitysniper',
  aliases: ['vs', 'vanity'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`administrator\``)] });

    const sub = (args[0] || '').toLowerCase();

    if (sub === 'list') {
      const snipers = db.get(`vanitysniper_${message.guild.id}`) || [];
      if (snipers.length === 0)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: No vanity snipers are set.`)] });

      const desc = snipers.map((v, i) => `**${i + 1}.** \`${v}\``).join('\n');
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Vanity Snipers').setDescription(desc)] });
    }

    if (sub === 'remove') {
      const vanity = args[1];
      if (!vanity)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Usage: \`${prefix}vanitysniper remove <vanity>\``)] });

      let snipers = db.get(`vanitysniper_${message.guild.id}`) || [];
      snipers = snipers.filter(v => v.toLowerCase() !== vanity.toLowerCase());
      db.set(`vanitysniper_${message.guild.id}`, snipers);

      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Removed vanity sniper for \`${vanity}\`.`)] });
    }

    if (!args[0])
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Command: vanitysniper').setDescription('Automatically snipe a vanity URL when it becomes available.').addFields({ name: 'Usage', value: `\`\`\`\n${prefix}vanitysniper <vanity>\n${prefix}vanitysniper list\n${prefix}vanitysniper remove <vanity>\n\`\`\``, inline: false }).setFooter({ text: 'Module: utility' }).setTimestamp()] });

    const vanity = args[0];
    const snipers = db.get(`vanitysniper_${message.guild.id}`) || [];

    if (snipers.includes(vanity.toLowerCase()))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('fe6464').setDescription(`${deny} ${message.author}: That vanity is already being sniped.`)] });

    snipers.push(vanity.toLowerCase());
    db.set(`vanitysniper_${message.guild.id}`, snipers);

    message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Now sniping vanity URL \`${vanity}\`. You will be notified when it becomes available.`)] });
  }
};

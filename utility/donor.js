const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { default_prefix, color } = require('../config.json');
const { warn, approve } = require('../emojis.json');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'donor',
        description: 'View donor perks and benefits',
        aliases: 'donator',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'donor',
        example: 'donor'
    }
],

    name: 'donor',
  aliases: ['donator'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    const isDonor = db.get(`donor_${message.author.id}`) || false;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ forceStatic: false }) })
      .setTitle('Donator Status')
      .setDescription(isDonor
        ? `${approve} You are a **donator**! Thank you for your support.`
        : `${warn} You are not a donator.\n\nBecome a donator to unlock exclusive perks and commands.`)
      .addFields(
        { name: 'Perks', value: '• Custom booster roles\n• Vanity sniper access\n• Extended API integrations\n• Priority support', inline: false }
      )
      .setFooter({ text: 'Module: utility' })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};

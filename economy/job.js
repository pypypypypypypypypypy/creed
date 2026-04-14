const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { isEnabled, fmt } = require('./utils');

module.exports = {
  category: 'economy',
  help: [
    {
        name: 'job',
        description: 'View or apply for a job',
        aliases: 'n/a',
        parameters: '[job name]',
        information: 'n/a',
        usage: 'job [job name]',
        example: 'job job name'
    }
],

    name: 'job',

  run: async (client, message, args) => {
    if (!isEnabled(message.guild.id)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: The economy system is **disabled** in this server.`)] });

    const guildId = message.guild.id;
    const sub = (args[0] || '').toLowerCase();

    if (sub === 'add') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: You need **Manage Server** permission.`)] });

      const name = args[1];
      const min = parseInt(args[2]);
      const max = parseInt(args[3]);
      const description = args.slice(4).join(' ') || null;

      if (!name || isNaN(min) || isNaN(max) || min <= 0 || max < min) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Usage: \`job add <name> <min payout> <max payout> [description]\``)] });

      const jobs = db.get(`economy.${guildId}.jobs`) || [];
      if (jobs.find(j => j.name.toLowerCase() === name.toLowerCase())) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: A job called **${name}** already exists.`)] });

      jobs.push({ name, min, max, description });
      db.set(`economy.${guildId}.jobs`, jobs);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Added job **${name}** with payout ${fmt(min)}–${fmt(max)}.`)] });
    }

    if (sub === 'remove') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: You need **Manage Server** permission.`)] });

      const name = args.slice(1).join(' ');
      if (!name) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Please provide the job name to remove.`)] });

      const jobs = db.get(`economy.${guildId}.jobs`) || [];
      const idx = jobs.findIndex(j => j.name.toLowerCase() === name.toLowerCase());
      if (idx === -1) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Job **${name}** not found.`)] });

      jobs.splice(idx, 1);
      db.set(`economy.${guildId}.jobs`, jobs);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Removed job **${name}**.`)] });
    }

    const jobs = db.get(`economy.${guildId}.jobs`) || [];
    if (!jobs.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} No custom jobs configured. Use \`job add <name> <min> <max> [desc]\`.`)] });

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('💼 Custom Jobs')
      .setDescription(jobs.map(j => `**${j.name}** — ${fmt(j.min)}–${fmt(j.max)}${j.description ? `\n> ${j.description}` : ''}`).join('\n\n'))
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};

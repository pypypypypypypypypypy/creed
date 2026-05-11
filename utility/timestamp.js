const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');

const FORMATS = {
  t:'Short Time', T:'Long Time', d:'Short Date', D:'Long Date',
  f:'Short Date/Time', F:'Long Date/Time', R:'Relative',
};

function parseDate(input) {
  if (!isNaN(Number(input))) return new Date(Number(input) * 1000);
  const m = input.match(/^in\s+(\d+)(s|m|h|d|w)$/i);
  if (m) {
    const mult = { s:1, m:60, h:3600, d:86400, w:604800 };
    return new Date(Date.now() + parseInt(m[1]) * mult[m[2].toLowerCase()] * 1000);
  }
  const p = Date.parse(input);
  return isNaN(p) ? null : new Date(p);
}

function buildEmbed(unix) {
  return new EmbedBuilder().setColor(color).setTitle('Discord Timestamps')
    .addFields(...Object.entries(FORMATS).map(([flag, desc]) => ({
      name: desc, value: `\`<t:${unix}:${flag}>\` → <t:${unix}:${flag}>`, inline: false,
    })), { name: 'Raw Unix', value: `\`${unix}\``, inline: false })
    .setFooter({ text: 'Module: utility' }).setTimestamp();
}

module.exports = {
  category: 'utility',
  name: 'timestamp',
  aliases: ['ts', 'time'],
  help: [{ name: 'timestamp', description: 'Convert a date to Discord timestamps', aliases: 'ts, time', parameters: '[date/time]', information: 'n/a', usage: 'timestamp [date]', example: 'timestamp December 25 2025' }],

  slashData: {
    name: 'timestamp',
    description: 'Convert a date or time into Discord timestamp formats',
    dm_permission: true,
    options: [{ type: 3, name: 'date', description: 'Date/time or unix (defaults to now)', required: false }],
  },
  runSlash: async (client, interaction) => {
    const input = interaction.options.getString('date');
    let unix;
    if (!input) {
      unix = Math.floor(Date.now() / 1000);
    } else {
      const d = parseDate(input);
      if (!d) return interaction.reply({ content: `Could not parse \`${input}\` as a date.`, ephemeral: true });
      unix = Math.floor(d.getTime() / 1000);
    }
    await interaction.reply({ embeds: [buildEmbed(unix)] });
  },

  run: async (client, message, args) => {
    if (!args[0]) {
      const unix = Math.floor(Date.now() / 1000);
      return message.channel.send({ embeds: [buildEmbed(unix)] });
    }
    const d = parseDate(args.join(' '));
    if (!d) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Could not parse that date.`)] });
    message.channel.send({ embeds: [buildEmbed(Math.floor(d.getTime() / 1000))] });
  }
};

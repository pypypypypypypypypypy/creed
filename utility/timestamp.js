const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');

const FORMATS = {
  t: 'Short Time (e.g. 9:41 PM)',
  T: 'Long Time (e.g. 9:41:30 PM)',
  d: 'Short Date (e.g. 12/31/2023)',
  D: 'Long Date (e.g. December 31, 2023)',
  f: 'Short Date/Time (e.g. December 31, 2023 9:41 PM)',
  F: 'Long Date/Time (e.g. Sunday, December 31, 2023 9:41 PM)',
  R: 'Relative (e.g. 2 hours ago)',
};

function parseDate(input) {
  if (!isNaN(Number(input))) return new Date(Number(input) * 1000);

  const now = new Date();

  // Support "in Xm/h/d"
  const inMatch = input.match(/^in\s+(\d+)(s|m|h|d|w)$/i);
  if (inMatch) {
    const val = parseInt(inMatch[1]);
    const unit = inMatch[2].toLowerCase();
    const mult = { s: 1, m: 60, h: 3600, d: 86400, w: 604800 };
    return new Date(Date.now() + val * mult[unit] * 1000);
  }

  // Try native Date.parse
  const parsed = Date.parse(input);
  if (!isNaN(parsed)) return new Date(parsed);

  return null;
}

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'timestamp',
        description: 'Convert a date to a Discord timestamp',
        aliases: 'ts',
        parameters: '(date/time)',
        information: 'n/a',
        usage: 'timestamp (date/time)',
        example: 'timestamp date/time'
    }
],

    name: 'timestamp',
  aliases: ['ts', 'time'],
  category: 'utility',

  run: async (client, message, args) => {
    if (!args[0]) {
      const now = Math.floor(Date.now() / 1000);
      const embed = new EmbedBuilder()
        .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
        .setTitle('Command: timestamp')
        .setDescription('Generate Discord timestamps for any date or time.')
        .addFields(
          { name: '**Aliases**', value: 'ts, time', inline: true },
          { name: '**Parameters**', value: '[date/time or unix]', inline: true },
          { name: '**Information**', value: 'Defaults to now', inline: true },
          { name: '**Usage**', value: [
            '```',
            `Syntax: ,timestamp [date/time]`,
            `Examples:`,
            `  ,timestamp`,
            `  ,timestamp 1700000000`,
            `  ,timestamp December 25 2025`,
            `  ,timestamp in 2h`,
            '```'
          ].join('\n') },
          { name: '**Current Time**', value: `Unix: \`${now}\`\n<t:${now}:F>` }
        )
        .setFooter({ text: 'Module: utility' })
        .setTimestamp()
        .setColor(color);
      return message.channel.send({ embeds: [embed] });
    }

    const input = args.join(' ');
    const date = parseDate(input);

    if (!date || isNaN(date.getTime()))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Could not parse \`${input}\` as a date or Unix timestamp.`)] });

    const unix = Math.floor(date.getTime() / 1000);

    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle('Discord Timestamps')
      .addFields(
        ...Object.entries(FORMATS).map(([flag, desc]) => ({
          name: desc,
          value: `\`<t:${unix}:${flag}>\` → <t:${unix}:${flag}>`,
          inline: false,
        })),
        { name: 'Raw Unix', value: `\`${unix}\``, inline: false }
      )
      .setFooter({ text: 'Module: utility' })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};

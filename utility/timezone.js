const { EmbedBuilder } = require('discord.js');
const moment = require('moment-timezone');
const { paginate } = require('../utils/paginate');
const db = require('../db');
const { color } = require('../config.json');
const { approve, warn, deny } = require('../emojis.json');

// Comprehensive alias map → IANA timezone name
const TZ_ALIASES = {
  // UTC / GMT
  'utc': 'UTC', 'gmt': 'UTC', 'gmt+0': 'UTC', 'utc+0': 'UTC',

  // North America
  'est': 'America/New_York', 'edt': 'America/New_York',
  'eastern': 'America/New_York', 'eastern time': 'America/New_York', 'et': 'America/New_York',
  'cst': 'America/Chicago', 'cdt': 'America/Chicago',
  'central': 'America/Chicago', 'central time': 'America/Chicago', 'ct': 'America/Chicago',
  'mst': 'America/Denver', 'mdt': 'America/Denver',
  'mountain': 'America/Denver', 'mountain time': 'America/Denver', 'mt': 'America/Denver',
  'pst': 'America/Los_Angeles', 'pdt': 'America/Los_Angeles',
  'pacific': 'America/Los_Angeles', 'pacific time': 'America/Los_Angeles', 'pt': 'America/Los_Angeles',
  'akst': 'America/Anchorage', 'akdt': 'America/Anchorage', 'alaska': 'America/Anchorage',
  'hst': 'Pacific/Honolulu', 'hawaii': 'Pacific/Honolulu',
  'ast': 'America/Halifax', 'adt': 'America/Halifax', 'atlantic': 'America/Halifax',
  'nst': 'America/St_Johns', 'ndt': 'America/St_Johns', 'newfoundland': 'America/St_Johns',
  'new york': 'America/New_York', 'los angeles': 'America/Los_Angeles',
  'chicago': 'America/Chicago', 'denver': 'America/Denver',
  'toronto': 'America/Toronto', 'vancouver': 'America/Vancouver',
  'mexico city': 'America/Mexico_City', 'mexico': 'America/Mexico_City',

  // South America
  'brt': 'America/Sao_Paulo', 'brazil': 'America/Sao_Paulo', 'sao paulo': 'America/Sao_Paulo',
  'art': 'America/Argentina/Buenos_Aires', 'argentina': 'America/Argentina/Buenos_Aires',
  'chile': 'America/Santiago', 'colombia': 'America/Bogota', 'peru': 'America/Lima',

  // Europe
  'wet': 'Europe/Lisbon', 'west': 'Europe/Lisbon',
  'cet': 'Europe/Paris', 'cest': 'Europe/Paris',
  'central european': 'Europe/Paris', 'central european time': 'Europe/Paris',
  'eet': 'Europe/Helsinki', 'eest': 'Europe/Helsinki',
  'eastern european': 'Europe/Helsinki', 'eastern european time': 'Europe/Helsinki',
  'bst': 'Europe/London', 'british': 'Europe/London',
  'london': 'Europe/London', 'uk': 'Europe/London', 'england': 'Europe/London',
  'paris': 'Europe/Paris', 'berlin': 'Europe/Berlin', 'rome': 'Europe/Rome',
  'madrid': 'Europe/Madrid', 'amsterdam': 'Europe/Amsterdam',
  'moscow': 'Europe/Moscow', 'msk': 'Europe/Moscow', 'russia': 'Europe/Moscow',
  'istanbul': 'Europe/Istanbul', 'turkey': 'Europe/Istanbul',
  'stockholm': 'Europe/Stockholm', 'oslo': 'Europe/Oslo', 'copenhagen': 'Europe/Copenhagen',
  'helsinki': 'Europe/Helsinki', 'warsaw': 'Europe/Warsaw', 'prague': 'Europe/Prague',
  'vienna': 'Europe/Vienna', 'zurich': 'Europe/Zurich', 'switzerland': 'Europe/Zurich',
  'brussels': 'Europe/Brussels', 'lisbon': 'Europe/Lisbon', 'portugal': 'Europe/Lisbon',
  'athens': 'Europe/Athens', 'greece': 'Europe/Athens', 'bucharest': 'Europe/Bucharest',
  'kyiv': 'Europe/Kyiv', 'ukraine': 'Europe/Kyiv',

  // Middle East & Africa
  'ist': 'Asia/Kolkata',
  'dubai': 'Asia/Dubai', 'gulf': 'Asia/Dubai', 'gst': 'Asia/Dubai', 'uae': 'Asia/Dubai',
  'riyadh': 'Asia/Riyadh', 'saudi': 'Asia/Riyadh', 'ast_sa': 'Asia/Riyadh',
  'cairo': 'Africa/Cairo', 'egypt': 'Africa/Cairo',
  'johannesburg': 'Africa/Johannesburg', 'south africa': 'Africa/Johannesburg', 'sast': 'Africa/Johannesburg',
  'nairobi': 'Africa/Nairobi', 'kenya': 'Africa/Nairobi', 'eat': 'Africa/Nairobi',
  'lagos': 'Africa/Lagos', 'nigeria': 'Africa/Lagos',

  // Asia
  'india': 'Asia/Kolkata', 'kolkata': 'Asia/Kolkata', 'mumbai': 'Asia/Kolkata', 'delhi': 'Asia/Kolkata',
  'pakistan': 'Asia/Karachi', 'karachi': 'Asia/Karachi', 'pkt': 'Asia/Karachi',
  'bangladesh': 'Asia/Dhaka', 'dhaka': 'Asia/Dhaka', 'bdt': 'Asia/Dhaka',
  'nepal': 'Asia/Kathmandu', 'kathmandu': 'Asia/Kathmandu',
  'sri lanka': 'Asia/Colombo', 'colombo': 'Asia/Colombo',
  'china': 'Asia/Shanghai', 'beijing': 'Asia/Shanghai', 'shanghai': 'Asia/Shanghai', 'cst_cn': 'Asia/Shanghai',
  'hong kong': 'Asia/Hong_Kong', 'hkt': 'Asia/Hong_Kong',
  'singapore': 'Asia/Singapore', 'sgt': 'Asia/Singapore',
  'malaysia': 'Asia/Kuala_Lumpur', 'kuala lumpur': 'Asia/Kuala_Lumpur', 'myt': 'Asia/Kuala_Lumpur',
  'philippines': 'Asia/Manila', 'manila': 'Asia/Manila', 'pht': 'Asia/Manila',
  'indonesia': 'Asia/Jakarta', 'jakarta': 'Asia/Jakarta', 'wib': 'Asia/Jakarta',
  'thailand': 'Asia/Bangkok', 'bangkok': 'Asia/Bangkok', 'ict': 'Asia/Bangkok',
  'vietnam': 'Asia/Ho_Chi_Minh', 'ho chi minh': 'Asia/Ho_Chi_Minh',
  'japan': 'Asia/Tokyo', 'tokyo': 'Asia/Tokyo', 'jst': 'Asia/Tokyo',
  'korea': 'Asia/Seoul', 'seoul': 'Asia/Seoul', 'kst': 'Asia/Seoul',
  'taiwan': 'Asia/Taipei', 'taipei': 'Asia/Taipei',
  'iran': 'Asia/Tehran', 'tehran': 'Asia/Tehran', 'irst': 'Asia/Tehran',
  'israel': 'Asia/Jerusalem', 'jerusalem': 'Asia/Jerusalem',
  'myanmar': 'Asia/Rangoon', 'rangoon': 'Asia/Rangoon',

  // Oceania
  'aest': 'Australia/Sydney', 'aedt': 'Australia/Sydney',
  'australia': 'Australia/Sydney', 'sydney': 'Australia/Sydney',
  'melbourne': 'Australia/Melbourne', 'brisbane': 'Australia/Brisbane',
  'acst': 'Australia/Darwin', 'darwin': 'Australia/Darwin',
  'awst': 'Australia/Perth', 'perth': 'Australia/Perth', 'wst': 'Australia/Perth',
  'new zealand': 'Pacific/Auckland', 'auckland': 'Pacific/Auckland', 'nzst': 'Pacific/Auckland', 'nzdt': 'Pacific/Auckland',
  'fiji': 'Pacific/Fiji',
};

function resolveTimezone(input) {
  if (!input) return null;
  const lower = input.toLowerCase().trim();

  // Direct IANA match
  if (moment.tz.zone(input)) return input;

  // Alias match
  if (TZ_ALIASES[lower]) return TZ_ALIASES[lower];

  // Partial IANA search (e.g. "new_york" → America/New_York)
  const all = moment.tz.names();
  const exact = all.find(z => z.toLowerCase() === lower);
  if (exact) return exact;

  const partial = all.find(z => z.toLowerCase().includes(lower));
  if (partial) return partial;

  return null;
}

function formatTime(tz) {
  const m = moment().tz(tz);
  return {
    time: m.format('h:mm A'),
    date: m.format('dddd, MMMM Do YYYY'),
    offset: m.format('UTC Z'),
    abbr: m.zoneAbbr(),
  };
}

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'timezone',
        description: 'View the timezone for a user',
        aliases: 'tz',
        parameters: '[user]',
        information: 'n/a',
        usage: 'timezone [user]',
        example: 'timezone user'
    }
],

    name: 'timezone',
  aliases: ['tz', 'time'],

  run: async (client, message, args) => {
    const prefix = db.get(`prefix_${message.guild.id}`) || ',';

    if (!args[0]) {
      const saved = db.get(`tz_${message.author.id}`);
      if (saved) {
        const f = formatTime(saved);
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(color)
              .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL({ forceStatic: false }) })
              .setTitle(`🕐 ${f.time}`)
              .setDescription(`**${f.date}**`)
              .addFields(
                { name: 'Timezone', value: saved, inline: true },
                { name: 'Abbreviation', value: f.abbr, inline: true },
                { name: 'UTC Offset', value: f.offset, inline: true },
              )
              .setFooter({ text: `Use ${prefix}tz set <timezone> to update` })
              .setTimestamp(),
          ],
        });
      }

      return paginate(message, [
        {
          name: 'timezone',
          description: 'Set and view timezones for yourself or other members',
          aliases: 'tz, time',
          parameters: 'n/a',
          information: 'n/a',
          usage: `${prefix}tz`,
          example: `${prefix}tz`,
        },
        {
          name: 'timezone set',
          description: 'Set your personal timezone — accepts IANA names, city names, or abbreviations',
          aliases: 'n/a',
          parameters: '(timezone)',
          information: 'n/a',
          usage: `${prefix}tz set (timezone)`,
          example: `${prefix}tz set America/New_York`,
        },
        {
          name: 'timezone remove',
          description: 'Remove your saved timezone',
          aliases: 'clear, delete',
          parameters: 'n/a',
          information: 'n/a',
          usage: `${prefix}tz remove`,
          example: `${prefix}tz remove`,
        },
        {
          name: 'timezone <@user>',
          description: 'View the current time for a mentioned member',
          aliases: 'n/a',
          parameters: '(@user)',
          information: 'n/a',
          usage: `${prefix}tz (@user)`,
          example: `${prefix}tz @user`,
        },
        {
          name: 'timezone list',
          description: 'Show all members in the server who have a timezone set',
          aliases: 'n/a',
          parameters: 'n/a',
          information: 'n/a',
          usage: `${prefix}tz list`,
          example: `${prefix}tz list`,
        },
      ], 'utility');
    }

    const sub = args[0].toLowerCase();

    // ,tz set <timezone>
    if (sub === 'set') {
      const input = args.slice(1).join(' ');
      if (!input) return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please provide a timezone — e.g. \`${prefix}tz set America/New_York\`, \`${prefix}tz set London\`, \`${prefix}tz set EST\``)]
      });

      const resolved = resolveTimezone(input);
      if (!resolved) return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Couldn't find timezone \`${input}\`. Try an IANA name like \`America/New_York\`, a city like \`London\`, or an abbreviation like \`PST\`.`)]
      });

      db.set(`tz_${message.author.id}`, resolved);
      const f = formatTime(resolved);
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('#a3eb7b')
            .setDescription(`${approve} ${message.author}: Your timezone has been set to **${resolved}**\nCurrent time: **${f.time}** (${f.abbr}, ${f.offset})`)
        ],
      });
    }

    // ,tz remove / clear / delete
    if (['remove', 'clear', 'delete'].includes(sub)) {
      if (!db.get(`tz_${message.author.id}`)) return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You don't have a timezone set.`)]
      });
      db.delete(`tz_${message.author.id}`);
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Your timezone has been removed.`)]
      });
    }

    // ,tz list
    if (sub === 'list') {
      const members = await message.guild.members.fetch().catch(() => message.guild.members.cache);
      const entries = [];
      for (const [id, member] of members) {
        if (member.user.bot) continue;
        const tz = db.get(`tz_${id}`);
        if (!tz) continue;
        const f = formatTime(tz);
        entries.push(`${member.user.username} — **${f.time}** (${tz})`);
      }
      if (!entries.length) return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: No members in this server have set a timezone yet.`)]
      });

      const chunks = [];
      for (let i = 0; i < entries.length; i += 15) chunks.push(entries.slice(i, i + 15));

      const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
      const buildEmbed = (i) => new EmbedBuilder()
        .setColor(color)
        .setAuthor({ name: message.guild.name, iconURL: message.guild.iconURL({ forceStatic: false }) || undefined })
        .setTitle('🌍 Server Timezones')
        .setDescription(chunks[i].join('\n'))
        .setFooter({ text: `Page ${i + 1}/${chunks.length} • ${entries.length} member${entries.length !== 1 ? 's' : ''}` });

      if (chunks.length === 1) return message.channel.send({ embeds: [buildEmbed(0)] });

      const buildRow = (i, disabled = false) => new ActionRowBuilder().addComponents(
        require('../utils/buttonEmoji').applyEmoji(new ButtonBuilder().setCustomId('tz_prev').setStyle(ButtonStyle.Secondary).setDisabled(disabled || i === 0), 'previous', '<'),
        require('../utils/buttonEmoji').applyEmoji(new ButtonBuilder().setCustomId('tz_stop').setStyle(ButtonStyle.Danger).setDisabled(disabled), 'cancel', '✕'),
        require('../utils/buttonEmoji').applyEmoji(new ButtonBuilder().setCustomId('tz_next').setStyle(ButtonStyle.Secondary).setDisabled(disabled || i === chunks.length - 1), 'next', '>'),
      );

      let cur = 0;
      const msg = await message.channel.send({ embeds: [buildEmbed(0)], components: [buildRow(0)] });
      const col = msg.createMessageComponentCollector({ componentType: ComponentType.Button, filter: i => i.user.id === message.author.id, time: 120_000 });
      col.on('collect', async i => {
        await i.deferUpdate();
        if (i.customId === 'tz_stop') { col.stop(); return msg.delete().catch(() => {}); }
        if (i.customId === 'tz_prev') cur = Math.max(0, cur - 1);
        if (i.customId === 'tz_next') cur = Math.min(chunks.length - 1, cur + 1);
        msg.edit({ embeds: [buildEmbed(cur)], components: [buildRow(cur)] }).catch(() => {});
      });
      col.on('end', () => msg.edit({ components: [buildRow(cur, true)] }).catch(() => {}));
      return;
    }

    // ,tz @user
    const target = message.mentions.users.first() || message.guild.members.cache.get(args[0])?.user;
    if (target) {
      const tz = db.get(`tz_${target.id}`);
      if (!tz) return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: **${target.username}** hasn't set a timezone yet.`)]
      });
      const f = formatTime(tz);
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(color)
            .setAuthor({ name: target.username, iconURL: target.displayAvatarURL({ forceStatic: false }) })
            .setTitle(`🕐 ${f.time}`)
            .setDescription(`**${f.date}**`)
            .addFields(
              { name: 'Timezone', value: tz, inline: true },
              { name: 'Abbreviation', value: f.abbr, inline: true },
              { name: 'UTC Offset', value: f.offset, inline: true },
            )
            .setTimestamp(),
        ],
      });
    }

    // ,tz <timezone string> — just show the time in that zone
    const resolved = resolveTimezone(args.join(' '));
    if (resolved) {
      const f = formatTime(resolved);
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(color)
            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL({ forceStatic: false }) })
            .setTitle(`🕐 ${f.time}`)
            .setDescription(`**${f.date}**`)
            .addFields(
              { name: 'Timezone', value: resolved, inline: true },
              { name: 'Abbreviation', value: f.abbr, inline: true },
              { name: 'UTC Offset', value: f.offset, inline: true },
            )
            .setTimestamp(),
        ],
      });
    }

    return message.channel.send({
      embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Couldn't find timezone \`${args.join(' ')}\`. Try \`${prefix}tz set America/New_York\`, \`${prefix}tz set London\`, or \`${prefix}tz set PST\`.`)]
    });
  },
};

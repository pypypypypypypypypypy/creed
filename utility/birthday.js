const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, PermissionFlagsBits } = require('discord.js');
const moment = require('moment-timezone');
const { paginate } = require('../utils/paginate');
const db = require('../db');
const { color } = require('../config.json');
const { approve, warn } = require('../emojis.json');

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_ALIASES = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

function parseMonth(str) {
  const n = parseInt(str);
  if (!isNaN(n) && n >= 1 && n <= 12) return n;
  return MONTH_ALIASES[str.toLowerCase()] || null;
}

function parseDay(str, month) {
  const n = parseInt(str);
  if (isNaN(n)) return null;
  const maxDays = [0,31,29,31,30,31,30,31,31,30,31,30,31][month];
  if (n < 1 || n > maxDays) return null;
  return n;
}

function ordinal(n) {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function daysUntilBirthday(month, day, userTz) {
  const tz = userTz || 'UTC';
  const now = moment().tz(tz);
  const thisYear = now.year();
  let next = moment.tz({ year: thisYear, month: month - 1, date: day }, tz);

  // If Feb 29 doesn't exist this year, push to Mar 1
  if (!next.isValid()) next = moment.tz({ year: thisYear, month: 1, date: 29 }, tz).add(1, 'day');

  if (next.isBefore(now, 'day')) {
    next = moment.tz({ year: thisYear + 1, month: month - 1, date: day }, tz);
    if (!next.isValid()) next = moment.tz({ year: thisYear + 1, month: 1, date: 29 }, tz).add(1, 'day');
  }

  const days = next.diff(now.startOf('day'), 'days');
  return { days, date: next };
}

function getUpcomingBirthdays(guildMembers, limit = 500) {
  const now = moment.utc();
  const results = [];

  for (const [id, member] of guildMembers) {
    if (member.user.bot) continue;
    const bday = db.get(`bday_${id}`);
    if (!bday) continue;
    const { month, day } = bday;
    const userTz = db.get(`tz_${id}`) || 'UTC';
    const { days, date } = daysUntilBirthday(month, day, userTz);
    results.push({ member, month, day, days, date });
  }

  results.sort((a, b) => a.days - b.days);
  return results.slice(0, limit);
}

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'birthday',
        description: 'Manage birthday reminders',
        aliases: 'bday',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'birthday',
        example: 'birthday'
    },
    {
        name: 'birthday set',
        description: 'Set your birthday',
        aliases: 'n/a',
        parameters: '(MM/DD)',
        information: 'n/a',
        usage: 'birthday set (MM/DD)',
        example: 'birthday set MM/DD'
    },
    {
        name: 'birthday remove',
        description: 'Remove your birthday',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'birthday remove',
        example: 'birthday remove'
    },
    {
        name: 'birthday list',
        description: 'View upcoming birthdays',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'birthday list',
        example: 'birthday list'
    }
],

    name: 'birthday',
  aliases: ['bday', 'bd'],

  run: async (client, message, args) => {
    const prefix = db.get(`prefix_${message.guild.id}`) || ',';

    if (!args[0]) {
      const saved = db.get(`bday_${message.author.id}`);
      if (saved) {
        const { month, day } = saved;
        const userTz = db.get(`tz_${message.author.id}`) || 'UTC';
        const { days } = daysUntilBirthday(month, day, userTz);
        const monthName = MONTHS[month - 1];
        const isToday = days === 0;

        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(color)
              .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL({ forceStatic: false }) })
              .setTitle(`🎂 ${monthName} ${ordinal(day)}`)
              .setDescription(isToday
                ? `🎉 **Happy Birthday, ${message.author}!** Today is your birthday!`
                : `Your next birthday is in **${days} day${days !== 1 ? 's' : ''}**`
              )
              .setFooter({ text: `Use ${prefix}bday set <month> <day> to update • ${prefix}bday remove to clear` })
              .setTimestamp(),
          ],
        });
      }

      return paginate(message, [
        {
          name: 'birthday',
          description: 'Set and view birthdays for yourself or other members',
          aliases: 'bday, bd',
          parameters: 'n/a',
          information: 'n/a',
          usage: `${prefix}bday`,
          example: `${prefix}bday`,
        },
        {
          name: 'birthday set',
          description: 'Set your birthday — accepts month names, abbreviations, or numbers',
          aliases: 'n/a',
          parameters: '(month) (day)',
          information: 'n/a',
          usage: `${prefix}bday set (month) (day)`,
          example: `${prefix}bday set January 5`,
        },
        {
          name: 'birthday remove',
          description: 'Remove your saved birthday',
          aliases: 'clear, delete',
          parameters: 'n/a',
          information: 'n/a',
          usage: `${prefix}bday remove`,
          example: `${prefix}bday remove`,
        },
        {
          name: 'birthday <@user>',
          description: "View another member's birthday and how many days until it",
          aliases: 'n/a',
          parameters: '(@user)',
          information: 'n/a',
          usage: `${prefix}bday (@user)`,
          example: `${prefix}bday @user`,
        },
        {
          name: 'birthday list',
          description: 'Show all upcoming birthdays in the server, sorted by soonest',
          aliases: 'n/a',
          parameters: 'n/a',
          information: 'n/a',
          usage: `${prefix}bday list`,
          example: `${prefix}bday list`,
        },
      ], 'utility');
    }

    const sub = args[0].toLowerCase();

    // ,bday set <month> <day>
    if (['channel', 'role', 'celebrate', 'config', 'lock', 'disable', 'off', 'unlock', 'enable', 'on'].includes(sub)) {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)]
      });
      if (sub === 'channel') {
        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
        if (!channel) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}birthday channel #channel\``)] });
        db.set(`birthday_channel_${message.guild.id}`, channel.id);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Birthday announcements will be sent in ${channel}.`)] });
      }
      if (sub === 'role') {
        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
        if (!role && args[1]?.toLowerCase() !== 'none') return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}birthday role @role\` or \`${prefix}birthday role none\``)] });
        if (args[1]?.toLowerCase() === 'none') db.delete(`birthday_role_${message.guild.id}`);
        else db.set(`birthday_role_${message.guild.id}`, role.id);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Birthday role ${role ? `set to ${role}` : 'cleared'}.`)] });
      }
      if (sub === 'celebrate') {
        if (args[1]?.toLowerCase() === 'list') {
          const users = db.get(`birthday_celebrate_${message.guild.id}`) || [];
          return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Birthday Celebrate List').setDescription(users.length ? users.map(id => `<@${id}>`).join('\n') : 'No members are queued for birthday celebration.')] });
        }
        const member = message.mentions.members.first() || message.guild.members.cache.get(args[1]);
        if (!member) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}birthday celebrate @member\``)] });
        const users = db.get(`birthday_celebrate_${message.guild.id}`) || [];
        if (!users.includes(member.id)) users.push(member.id);
        db.set(`birthday_celebrate_${message.guild.id}`, users);
        const channelId = db.get(`birthday_channel_${message.guild.id}`);
        const roleId = db.get(`birthday_role_${message.guild.id}`);
        const channel = channelId ? message.guild.channels.cache.get(channelId) : message.channel;
        if (roleId) await member.roles.add(roleId).catch(() => null);
        await channel.send({ content: `${roleId ? `<@&${roleId}> ` : ''}Happy birthday, ${member}!`, embeds: [new EmbedBuilder().setColor(color).setDescription(`Everyone wish ${member} a happy birthday.`).setTimestamp()] }).catch(() => null);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Birthday celebration sent for ${member}.`)] });
      }
      if (['lock', 'disable', 'off'].includes(sub)) {
        db.set(`birthday_disabled_${message.guild.id}`, true);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Birthday announcements disabled.`)] });
      }
      if (['unlock', 'enable', 'on'].includes(sub)) {
        db.set(`birthday_disabled_${message.guild.id}`, false);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Birthday announcements enabled.`)] });
      }
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Birthday Configuration').addFields(
        { name: 'Announcements', value: db.get(`birthday_disabled_${message.guild.id}`) ? 'Disabled' : 'Enabled', inline: true },
        { name: 'Channel', value: db.get(`birthday_channel_${message.guild.id}`) ? `<#${db.get(`birthday_channel_${message.guild.id}`)}>` : 'Current channel', inline: true },
        { name: 'Role', value: db.get(`birthday_role_${message.guild.id}`) ? `<@&${db.get(`birthday_role_${message.guild.id}`)}>` : 'None', inline: true }
      ).setTimestamp()] });
    }

    if (sub === 'set') {
      const monthInput = args[1];
      const dayInput = args[2];
      if (!monthInput || !dayInput) return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please provide a month and day — e.g. \`${prefix}bday set January 5\` or \`${prefix}bday set 01 05\``)]
      });

      const month = parseMonth(monthInput);
      if (!month) return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Invalid month \`${monthInput}\`. Use a name like \`January\` or a number like \`1\`.`)]
      });

      const day = parseDay(dayInput, month);
      if (!day) return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Invalid day \`${dayInput}\` for **${MONTHS[month - 1]}**.`)]
      });

      db.set(`bday_${message.author.id}`, { month, day });
      const userTz = db.get(`tz_${message.author.id}`) || 'UTC';
      const { days } = daysUntilBirthday(month, day, userTz);
      const isToday = days === 0;

      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('#a3eb7b')
            .setDescription(
              `${approve} ${message.author}: Your birthday has been set to **${MONTHS[month - 1]} ${ordinal(day)}**\n` +
              (isToday ? `🎉 **Happy Birthday!**` : `That's in **${days} day${days !== 1 ? 's' : ''}**`)
            )
        ],
      });
    }

    // ,bday remove / clear / delete
    if (['remove', 'clear', 'delete'].includes(sub)) {
      if (!db.get(`bday_${message.author.id}`)) return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You don't have a birthday set.`)]
      });
      db.delete(`bday_${message.author.id}`);
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Your birthday has been removed.`)]
      });
    }

    // ,bday list
    if (sub === 'list') {
      const members = await message.guild.members.fetch().catch(() => message.guild.members.cache);
      const upcoming = getUpcomingBirthdays(members);

      if (!upcoming.length) return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: No members in this server have set a birthday yet.`)]
      });

      const lines = upcoming.map(({ member, month, day, days }) => {
        const label = days === 0 ? '🎉 **Today!**' : `in **${days} day${days !== 1 ? 's' : ''}**`;
        return `${member.user.username} — **${MONTHS[month - 1]} ${ordinal(day)}** (${label})`;
      });

      const chunks = [];
      for (let i = 0; i < lines.length; i += 15) chunks.push(lines.slice(i, i + 15));

      const buildEmbed = (i) => new EmbedBuilder()
        .setColor(color)
        .setAuthor({ name: message.guild.name, iconURL: message.guild.iconURL({ forceStatic: false }) || undefined })
        .setTitle('🎂 Upcoming Birthdays')
        .setDescription(chunks[i].join('\n'))
        .setFooter({ text: `Page ${i + 1}/${chunks.length} • ${upcoming.length} member${upcoming.length !== 1 ? 's' : ''}` });

      if (chunks.length === 1) return message.channel.send({ embeds: [buildEmbed(0)] });

      const buildRow = (i, disabled = false) => new ActionRowBuilder().addComponents(
        require('../utils/buttonEmoji').applyEmoji(new ButtonBuilder().setCustomId('bd_prev').setStyle(ButtonStyle.Secondary).setDisabled(disabled || i === 0), 'previous', '<'),
        require('../utils/buttonEmoji').applyEmoji(new ButtonBuilder().setCustomId('bd_stop').setStyle(ButtonStyle.Danger).setDisabled(disabled), 'cancel', '✕'),
        require('../utils/buttonEmoji').applyEmoji(new ButtonBuilder().setCustomId('bd_next').setStyle(ButtonStyle.Secondary).setDisabled(disabled || i === chunks.length - 1), 'next', '>'),
      );

      let cur = 0;
      const msg = await message.channel.send({ embeds: [buildEmbed(0)], components: [buildRow(0)] });
      const col = msg.createMessageComponentCollector({ componentType: ComponentType.Button, filter: i => i.user.id === message.author.id, time: 120_000 });
      col.on('collect', async i => {
        await i.deferUpdate();
        if (i.customId === 'bd_stop') { col.stop(); return msg.delete().catch(() => {}); }
        if (i.customId === 'bd_prev') cur = Math.max(0, cur - 1);
        if (i.customId === 'bd_next') cur = Math.min(chunks.length - 1, cur + 1);
        msg.edit({ embeds: [buildEmbed(cur)], components: [buildRow(cur)] }).catch(() => {});
      });
      col.on('end', () => msg.edit({ components: [buildRow(cur, true)] }).catch(() => {}));
      return;
    }

    // ,bday @user
    const target = message.mentions.users.first() || message.guild.members.cache.get(args[0])?.user;
    if (target) {
      const bday = db.get(`bday_${target.id}`);
      if (!bday) return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: **${target.username}** hasn't set a birthday yet.`)]
      });
      const { month, day } = bday;
      const userTz = db.get(`tz_${target.id}`) || 'UTC';
      const { days } = daysUntilBirthday(month, day, userTz);
      const isToday = days === 0;

      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(color)
            .setAuthor({ name: target.username, iconURL: target.displayAvatarURL({ forceStatic: false }) })
            .setTitle(`🎂 ${MONTHS[month - 1]} ${ordinal(day)}`)
            .setDescription(isToday
              ? `🎉 **Today is ${target.username}'s birthday!**`
              : `**${target.username}'s** next birthday is in **${days} day${days !== 1 ? 's' : ''}**`
            )
            .setTimestamp(),
        ],
      });
    }

    return message.channel.send({
      embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please mention a user or use \`${prefix}bday set (month) (day)\` to set yours.`)]
    });
  },
};

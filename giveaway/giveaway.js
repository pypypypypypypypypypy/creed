const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { default_prefix, color } = require('../config.json');
const { approve, warn } = require('../emojis.json');
const { paginate } = require('../utils/paginate');

// ── Utilities ──────────────────────────────────────────────────────────────

function parseDuration(str) {
  const regex = /(\d+)\s*(s|sec|m|min|h|hr|d|day|w|week)/gi;
  let total = 0, match, matched = false;
  while ((match = regex.exec(str)) !== null) {
    matched = true;
    const v = parseInt(match[1]), u = match[2].toLowerCase();
    if (u.startsWith('s')) total += v * 1000;
    else if (u.startsWith('m')) total += v * 60000;
    else if (u.startsWith('h')) total += v * 3600000;
    else if (u.startsWith('d')) total += v * 86400000;
    else if (u.startsWith('w')) total += v * 604800000;
  }
  return matched ? total : null;
}

function parseMessageLink(link) {
  const m = link.match(/discord(?:app)?\.com\/channels\/(\d+)\/(\d+)\/(\d+)/);
  if (!m) return null;
  return { guildId: m[1], channelId: m[2], messageId: m[3] };
}

function parseColor(input) {
  const hex = input.replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(hex)) return `#${hex}`;
  const map = { red: '#ff0000', blue: '#0000ff', green: '#00ff00', yellow: '#ffff00', purple: '#800080', orange: '#ff8000', pink: '#ffc0cb', white: '#ffffff', black: '#000000', cyan: '#00ffff', gold: '#ffd700', blurple: '#5865f2' };
  return map[input.toLowerCase()] || null;
}

function randomWinners(entries, count) {
  const shuffled = [...entries].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function parseRoles(input) {
  if (input.toLowerCase() === 'none') return [];
  return (input.match(/\d{17,19}/g) || []);
}

function parseMembers(input) {
  return (input.match(/\d{17,19}/g) || []);
}

function buildEmbed(g) {
  const embed = new EmbedBuilder()
    .setTitle('🎉 GIVEAWAY 🎉')
    .setColor(g.color || '#5865f2')
    .addFields(
      { name: 'Prize', value: g.prize, inline: false },
      { name: 'Winners', value: `${g.winnersCount}`, inline: true },
      { name: 'Ends', value: `<t:${Math.floor(g.endTime / 1000)}:R>`, inline: true },
      { name: 'Hosted by', value: [g.hostId, ...(g.hosts || []).filter(h => h !== g.hostId)].map(h => `<@${h}>`).join(', '), inline: true }
    )
    .setFooter({ text: `Entries: ${(g.entries || []).length}` })
    .setTimestamp(g.endTime);

  if (g.description) embed.setDescription(g.description);

  const reqs = [];
  if (g.minLevel) reqs.push(`Min Level: ${g.minLevel}`);
  if (g.maxLevel) reqs.push(`Max Level: ${g.maxLevel}`);
  if (g.minAccountAgeDays) reqs.push(`Account Age: ${g.minAccountAgeDays}d+`);
  if (g.minServerStayDays) reqs.push(`Server Stay: ${g.minServerStayDays}d+`);
  if (g.requiredRoles && g.requiredRoles.length) reqs.push(`Required Roles: ${g.requiredRoles.map(r => `<@&${r}>`).join(', ')}`);
  if (reqs.length) embed.addFields({ name: 'Requirements', value: reqs.join('\n') });

  if (g.imageUrl) embed.setImage(g.imageUrl);
  if (g.thumbnailUrl) embed.setThumbnail(g.thumbnailUrl);
  return embed;
}

function buildEndedEmbed(g) {
  return new EmbedBuilder()
    .setTitle('🎉 GIVEAWAY ENDED 🎉')
    .setColor('#2b2d31')
    .addFields(
      { name: 'Prize', value: g.prize },
      { name: 'Winners', value: (g.winners && g.winners.length) ? g.winners.map(w => `<@${w}>`).join(', ') : 'No valid entries' },
      { name: 'Hosted by', value: `<@${g.hostId}>`, inline: true }
    )
    .setFooter({ text: `ID: ${g.messageId}` })
    .setTimestamp();
}

function entryButton(count) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('giveaway_enter').setLabel(`🎉 Enter (${count})`).setStyle(ButtonStyle.Primary)
  );
}

// ── Timer management ───────────────────────────────────────────────────────

async function endGiveaway(client, messageId, reroll = false) {
  const g = db.get(`giveaway_${messageId}`);
  if (!g || g.cancelled) return;

  const winners = randomWinners(g.entries || [], g.winnersCount);
  g.ended = true;
  g.winners = winners;
  db.set(`giveaway_${messageId}`, g);

  if (client.giveawayTimers) client.giveawayTimers.delete(messageId);

  try {
    const channel = await client.channels.fetch(g.channelId);
    const message = await channel.messages.fetch(messageId);
    await message.edit({ embeds: [buildEndedEmbed(g)], components: [] });

    if (winners.length) {
      const label = reroll ? 'Reroll! New winner(s)' : 'Congratulations';
      await channel.send(`🎉 ${label}: ${winners.map(w => `<@${w}>`).join(', ')}! You won **${g.prize}**!`);

      if (g.winnerRoles && g.winnerRoles.length) {
        const guild = await client.guilds.fetch(g.guildId);
        for (const uid of winners) {
          const member = await guild.members.fetch(uid).catch(() => null);
          if (member) await member.roles.add(g.winnerRoles).catch(() => {});
        }
      }
    } else {
      await channel.send(`😔 No valid entries for **${g.prize}**.`);
    }
  } catch (e) {
    console.error('Giveaway end error:', e.message);
  }
}

function scheduleEnd(client, messageId, ms) {
  if (!client.giveawayTimers) client.giveawayTimers = new Map();
  if (client.giveawayTimers.has(messageId)) clearTimeout(client.giveawayTimers.get(messageId));
  const timer = setTimeout(() => endGiveaway(client, messageId), ms);
  client.giveawayTimers.set(messageId, timer);
}

async function refreshMessage(client, g) {
  try {
    const channel = await client.channels.fetch(g.channelId);
    const message = await channel.messages.fetch(g.messageId);
    await message.edit({ embeds: [buildEmbed(g)], components: [entryButton((g.entries || []).length)] });
  } catch {}
}

// ── Command ────────────────────────────────────────────────────────────────

module.exports = {
  name: 'giveaway',
  aliases: ['giveaways', 'g'],
  category: 'giveaway',
  help: [
    { name: 'giveaway', description: 'Manage server giveaways', aliases: 'giveaways, g', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'giveaway', example: 'giveaway' },
    { name: 'giveaway start', description: 'Start a new giveaway', aliases: 'n/a', parameters: '(channel) (duration) (winners) (prize)', information: 'MANAGE_GUILD', usage: 'giveaway start #channel (duration) (winners) (prize)', example: 'giveaway start #giveaways 1d 1 Nitro' },
    { name: 'giveaway end', description: 'End a giveaway early', aliases: 'n/a', parameters: '(message link)', information: 'MANAGE_GUILD', usage: 'giveaway end (message link)', example: 'giveaway end https://discord.com/...' },
    { name: 'giveaway reroll', description: 'Reroll giveaway winners', aliases: 'n/a', parameters: '(message link) [count]', information: 'MANAGE_GUILD', usage: 'giveaway reroll (message link) [count]', example: 'giveaway reroll https://discord.com/...' },
    { name: 'giveaway cancel', description: 'Cancel a running giveaway', aliases: 'n/a', parameters: '(message link)', information: 'MANAGE_GUILD', usage: 'giveaway cancel (message link)', example: 'giveaway cancel https://discord.com/...' },
    { name: 'giveaway list', description: 'List all active giveaways', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'giveaway list', example: 'giveaway list' },
  ],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`);
    if (prefix === null) prefix = default_prefix;

    const sub = (args.shift() || '').toLowerCase();

    switch (sub) {
      case 'start':
      case 'create': {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
          return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_channels\``)] });
        }

        const channelId = (args.shift() || '').match(/\d+/)?.[0];
        const durationStr = args.shift() || '';
        const winnersStr = args.shift() || '';
        const prize = args.join(' ');

        if (!channelId || !durationStr || !winnersStr || !prize) {
          return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}giveaway start <#channel> <duration> <winners> <prize>\`\nExample: \`${prefix}giveaway start #giveaways 1d 1 Nitro Classic\``)] });
        }

        const ms = parseDuration(durationStr);
        if (!ms || ms < 10000) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Invalid **duration** — examples: \`1d\`, \`12h\`, \`30m\``)] });

        const winners = parseInt(winnersStr);
        if (isNaN(winners) || winners < 1) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Winners must be a **positive number**`)] });

        const endTime = Date.now() + ms;
        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (!channel || !channel.isTextBased()) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please provide a valid **text channel**`)] });

        const g = {
          guildId: message.guild.id,
          channelId,
          hostId: message.author.id,
          hosts: [],
          prize,
          winnersCount: winners,
          endTime,
          entries: [],
          winners: [],
          winnerRoles: [],
          requiredRoles: [],
          ended: false,
          cancelled: false,
        };

        const msg = await channel.send({ embeds: [buildEmbed(g)], components: [entryButton(0)] });
        g.messageId = msg.id;
        db.set(`giveaway_${msg.id}`, g);

        const guildList = db.get(`giveaways_${message.guild.id}`) || [];
        guildList.push(msg.id);
        db.set(`giveaways_${message.guild.id}`, guildList);
        const allIds = db.get('__all_giveaway_ids') || [];
        allIds.push(msg.id);
        db.set('__all_giveaway_ids', allIds);

        scheduleEnd(client, msg.id, ms);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Giveaway started in ${channel}! [Jump](${msg.url})`)] });
      }

      case 'end': {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_channels\``)] });
        const g = resolveGiveaway(message, args[0]);
        if (!g) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Giveaway **not found** — provide a valid message link`)] });
        if (g.ended) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: This giveaway has already **ended**`)] });
        if (g.cancelled) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: This giveaway was **cancelled**`)] });
        if (client.giveawayTimers?.has(g.messageId)) { clearTimeout(client.giveawayTimers.get(g.messageId)); client.giveawayTimers.delete(g.messageId); }
        await endGiveaway(client, g.messageId);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Giveaway has been **ended**`)] });
      }

      case 'reroll': {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_channels\``)] });
        const g = resolveGiveaway(message, args[0]);
        if (!g) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Giveaway **not found**`)] });
        if (!g.ended && !g.cancelled) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: This giveaway **hasn't ended** yet`)] });
        if (!g.entries.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: There are **no entries** to reroll`)] });
        const count = args[1] ? parseInt(args[1]) : g.winnersCount;
        const newWinners = randomWinners(g.entries, count);
        g.winners = newWinners;
        db.set(`giveaway_${g.messageId}`, g);
        try {
          const channel = await client.channels.fetch(g.channelId);
          await channel.send(`🔁 Reroll! New winner(s): ${newWinners.map(w => `<@${w}>`).join(', ')}! You won **${g.prize}**!`);
          const msg = await channel.messages.fetch(g.messageId);
          await msg.edit({ embeds: [buildEndedEmbed(g)] });
        } catch {}
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Rerolled **${newWinners.length}** winner(s)`)] });
      }

      case 'cancel': {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_channels\``)] });
        const g = resolveGiveaway(message, args[0]);
        if (!g) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Giveaway **not found**`)] });
        if (g.ended || g.cancelled) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: This giveaway is already **finished**`)] });
        g.cancelled = true;
        db.set(`giveaway_${g.messageId}`, g);
        if (client.giveawayTimers?.has(g.messageId)) { clearTimeout(client.giveawayTimers.get(g.messageId)); client.giveawayTimers.delete(g.messageId); }
        try {
          const channel = await client.channels.fetch(g.channelId);
          const msg = await channel.messages.fetch(g.messageId);
          await msg.edit({ embeds: [buildEndedEmbed({ ...g, winners: [] })], components: [] });
        } catch {}
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Giveaway has been **cancelled**`)] });
      }

      case 'list': {
        const ids = db.get(`giveaways_${message.guild.id}`) || [];
        const active = ids.map(id => db.get(`giveaway_${id}`)).filter(g => g && !g.ended && !g.cancelled);
        if (!active.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: There are **no active giveaways**`)] });
        const lines = active.map(g => `• **${g.prize}** — ${g.winnersCount} winner(s) — ends <t:${Math.floor(g.endTime / 1000)}:R> — [Jump](https://discord.com/channels/${g.guildId}/${g.channelId}/${g.messageId})`);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(`Active Giveaways (${active.length})`).setDescription(lines.join('\n'))] });
      }

      case 'edit': {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_channels\``)] });
        const editSub = (args.shift() || '').toLowerCase();
        const g = resolveGiveaway(message, args.shift());
        if (!g) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Giveaway **not found**`)] });
        if (g.ended || g.cancelled) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Cannot edit a **finished** giveaway`)] });

        let successMsg = `${approve} ${message.author}: Giveaway has been **updated**`;
        switch (editSub) {
          case 'prize': { const v = args.join(' '); if (!v) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}giveaway edit prize <link> <prize>\``)] }); g.prize = v; successMsg = `${approve} ${message.author}: Prize changed to **${v}**`; break; }
          case 'winners': { const v = parseInt(args[0]); if (isNaN(v)||v<1) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}giveaway edit winners <link> <count>\``)] }); g.winnersCount = v; successMsg = `${approve} ${message.author}: Winners set to **${v}**`; break; }
          case 'duration': { const ms = parseDuration(args[0]||''); if (!ms) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}giveaway edit duration <link> <duration>\``)] }); g.endTime = Date.now() + ms; scheduleEnd(client, g.messageId, ms); successMsg = `${approve} ${message.author}: End time has been **updated**`; break; }
          case 'description': { const v = args.join(' '); if (!v) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}giveaway edit description <link> <text>\``)] }); g.description = v; break; }
          case 'image': { if (!args[0]) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}giveaway edit image <link> <url>\``)] }); g.imageUrl = args[0]; break; }
          case 'thumbnail': { if (!args[0]) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}giveaway edit thumbnail <link> <url>\``)] }); g.thumbnailUrl = args[0]; break; }
          case 'color': { const v = parseColor(args.join(' ')); if (!v) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Invalid **color** provided`)] }); g.color = v; break; }
          case 'requiredroles': { g.requiredRoles = parseRoles(args.join(' ')); successMsg = `${approve} ${message.author}: Required roles have been **updated**`; break; }
          case 'roles': { g.winnerRoles = parseRoles(args.join(' ')); successMsg = `${approve} ${message.author}: Winner roles have been **updated**`; break; }
          case 'host': { const m = parseMembers(args.join(' ')); if (!m.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}giveaway edit host <link> <@member>\``)] }); g.hostId = m[0]; g.hosts = m.slice(1); break; }
          case 'minlevel': { const v = parseInt(args[0]); g.minLevel = v === 0 ? null : v; break; }
          case 'maxlevel': { const v = parseInt(args[0]); g.maxLevel = v === 0 ? null : v; break; }
          case 'age': { const v = parseInt(args[0]); g.minAccountAgeDays = v === 0 ? null : v; break; }
          case 'stay': { const v = parseInt(args[0]); g.minServerStayDays = v === 0 ? null : v; break; }
          default: return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Edit options: \`prize\` \`winners\` \`duration\` \`description\` \`image\` \`thumbnail\` \`color\` \`requiredroles\` \`roles\` \`host\` \`minlevel\` \`maxlevel\` \`age\` \`stay\``)] });
        }

        db.set(`giveaway_${g.messageId}`, g);
        await refreshMessage(client, g);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(successMsg)] });
      }

      default:
        return paginate(message, [
          {
            name: 'giveaway',
            description: 'Manage giveaways in your server',
            aliases: 'giveaways, g',
            parameters: 'n/a',
            information: 'MANAGE_CHANNELS',
            usage: `${prefix}giveaway`,
            example: `${prefix}giveaway`
          },
          {
            name: 'giveaway start',
            description: 'Start a new giveaway in a channel',
            aliases: 'create',
            parameters: '(#channel) (duration) (winners) (prize)',
            information: 'MANAGE_CHANNELS',
            usage: `${prefix}giveaway start <#channel> <duration> <winners> <prize>`,
            example: `${prefix}giveaway start #giveaways 1d 1 Nitro Classic`
          },
          {
            name: 'giveaway end',
            description: 'End a giveaway early',
            aliases: 'n/a',
            parameters: '(message link)',
            information: 'MANAGE_CHANNELS',
            usage: `${prefix}giveaway end <message_link>`,
            example: `${prefix}giveaway end https://discord.com/channels/...`
          },
          {
            name: 'giveaway reroll',
            description: 'Reroll winners for an ended giveaway',
            aliases: 'n/a',
            parameters: '(message link) [count]',
            information: 'MANAGE_CHANNELS',
            usage: `${prefix}giveaway reroll <message_link> [count]`,
            example: `${prefix}giveaway reroll https://discord.com/channels/... 2`
          },
          {
            name: 'giveaway cancel',
            description: 'Cancel an active giveaway',
            aliases: 'n/a',
            parameters: '(message link)',
            information: 'MANAGE_CHANNELS',
            usage: `${prefix}giveaway cancel <message_link>`,
            example: `${prefix}giveaway cancel https://discord.com/channels/...`
          },
          {
            name: 'giveaway list',
            description: 'List all active giveaways in the server',
            aliases: 'n/a',
            parameters: 'n/a',
            information: 'n/a',
            usage: `${prefix}giveaway list`,
            example: `${prefix}giveaway list`
          },
          {
            name: 'giveaway edit',
            description: 'Edit an active giveaway',
            aliases: 'n/a',
            parameters: '(option) (message link) (value)',
            information: 'MANAGE_CHANNELS',
            usage: `${prefix}giveaway edit <option> <message_link> <value>`,
            example: `${prefix}giveaway edit prize https://discord.com/channels/... Nitro`
          }
        ], 'giveaway');
    }
  }
};

function resolveGiveaway(message, link) {
  if (!link) return null;
  const parsed = parseMessageLink(link);
  if (!parsed) return null;
  return db.get(`giveaway_${parsed.messageId}`);
}

module.exports.endGiveaway = endGiveaway;
module.exports.scheduleEnd = scheduleEnd;

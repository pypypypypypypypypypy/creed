const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { color, default_prefix } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { paginate } = require('../utils/paginate');
const db = require('../db');

function parseMessageId(input) {
  const match = String(input || '').match(/(?:discord(?:app)?\.com\/channels\/\d+\/\d+\/)?(\d{17,20})/);
  return match ? match[1] : null;
}

function parseAmount(args) {
  const n = args.find(a => /^\d+$/.test(a));
  return Math.min(Math.max(parseInt(n || '50', 10) || 50, 1), 100);
}

module.exports = {
  name: 'purge',
  aliases: ['clear', 'prune', 'c'],
  category: 'moderation',
  help: [
    { name: 'purge', description: 'Delete messages from the current channel', aliases: 'clear, prune, c', parameters: '(amount)', information: 'MANAGE_MESSAGES', usage: 'purge 50', example: 'purge 50' },
    { name: 'purge bots', description: 'Delete recent bot messages', aliases: 'n/a', parameters: '[amount]', information: 'MANAGE_MESSAGES', usage: 'purge bots 50', example: 'purge bots 25' },
    { name: 'purge embeds', description: 'Delete recent messages containing embeds', aliases: 'embed', parameters: '[amount]', information: 'MANAGE_MESSAGES', usage: 'purge embeds 50', example: 'purge embeds' },
    { name: 'purge startswith', description: 'Delete messages starting with text', aliases: 'n/a', parameters: '(text) [amount]', information: 'MANAGE_MESSAGES', usage: 'purge startswith ! 50', example: 'purge startswith !' },
    { name: 'purge between', description: 'Delete cached messages between two message IDs', aliases: 'bt', parameters: '(message id) (message id)', information: 'MANAGE_MESSAGES', usage: 'purge between id id', example: 'purge between 123 456' }
  ],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_messages\``)] });
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`manage_messages\``)] });

    const prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;
    const sub = args[0]?.toLowerCase();
    if (!sub) return paginate(message, module.exports.help.map(h => ({ ...h, usage: `${prefix}${h.usage}` })), 'moderation');

    const amount = parseAmount(args);
    const fetched = await message.channel.messages.fetch({ limit: 100 }).catch(() => null);
    if (!fetched) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I could not fetch recent messages.`)] });

    let filtered = fetched;
    const ids = args.map(parseMessageId).filter(Boolean);

    const mentioned = message.mentions.users.filter(u => u.id !== client.user.id).first();
    const userMentionMatch = args[0]?.match(/^<@!?(\d{17,20})>$/);
    let targetUserId = null;
    if (userMentionMatch) targetUserId = userMentionMatch[1];
    else if (mentioned) targetUserId = mentioned.id;
    else if (/^\d{17,20}$/.test(args[0] || '')) {
      const u = await client.users.fetch(args[0]).catch(() => null);
      if (u) targetUserId = u.id;
    }

    if (targetUserId) {
      filtered = fetched.filter(m => m.author.id === targetUserId);
    }
    else if (/^\d+$/.test(sub)) filtered = fetched.first(Math.min(parseInt(sub, 10), 100));
    else if (sub === 'bots') filtered = fetched.filter(m => m.author.bot);
    else if (sub === 'humans') filtered = fetched.filter(m => !m.author.bot);
    else if (['embeds', 'embed'].includes(sub)) filtered = fetched.filter(m => m.embeds.length);
    else if (sub === 'files') filtered = fetched.filter(m => m.attachments.size);
    else if (sub === 'images') filtered = fetched.filter(m => m.attachments.some(a => a.contentType?.startsWith('image/')));
    else if (sub === 'mentions') filtered = fetched.filter(m => m.mentions.users.size || m.mentions.roles.size);
    else if (sub === 'reactions') filtered = fetched.filter(m => m.reactions.cache.size);
    else if (sub === 'webhooks') filtered = fetched.filter(m => m.webhookId);
    else if (sub === 'stickers') filtered = fetched.filter(m => m.stickers?.size);
    else if (['emoji', 'emojis', 'emotes', 'emote'].includes(sub)) filtered = fetched.filter(m => /<a?:\w+:\d+>|[\u{1F300}-\u{1FAFF}]/u.test(m.content));
    else if (['activity', 'activities'].includes(sub)) filtered = fetched.filter(m => m.activity || m.applicationId);
    else if (sub === 'startswith') {
      const text = args.slice(1).filter(a => !/^\d+$/.test(a)).join(' ');
      if (!text) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}purge startswith <text> [amount]\``)] });
      filtered = fetched.filter(m => m.content.startsWith(text));
    } else if (sub === 'endswith') {
      const text = args.slice(1).filter(a => !/^\d+$/.test(a)).join(' ');
      if (!text) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}purge endswith <text> [amount]\``)] });
      filtered = fetched.filter(m => m.content.endsWith(text));
    } else if (sub === 'after' && ids[0]) filtered = fetched.filter(m => BigInt(m.id) > BigInt(ids[0]));
    else if (sub === 'before' && ids[0]) filtered = fetched.filter(m => BigInt(m.id) < BigInt(ids[0]));
    else if (sub === 'upto' && ids[0]) filtered = fetched.filter(m => BigInt(m.id) <= BigInt(ids[0]));
    else if (['between', 'bt'].includes(sub) && ids.length >= 2) {
      const a = BigInt(ids[0]);
      const b = BigInt(ids[1]);
      const min = a < b ? a : b;
      const max = a > b ? a : b;
      filtered = fetched.filter(m => BigInt(m.id) >= min && BigInt(m.id) <= max);
    } else return paginate(message, module.exports.help.map(h => ({ ...h, usage: `${prefix}${h.usage}` })), 'moderation');

    const toDelete = Array.isArray(filtered) ? filtered.slice(0, amount) : filtered.first(amount);
    if (!toDelete.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: No matching messages found in the recent cache.`)] });

    const deleted = await message.channel.bulkDelete(toDelete, true).catch(() => null);
    if (!deleted) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Unable to purge those messages. Discord may reject messages older than 14 days.`)] });
    const msg = await message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Purged **${deleted.size}** message(s).`)] });
    setTimeout(() => msg.delete().catch(() => {}), 3000);
  }
};

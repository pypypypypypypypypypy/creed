const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve, deny } = require('../emojis.json');
const { default_prefix } = require('../config.json');
const { paginate } = require('../utils/paginate');

module.exports = {
  name: 'suggest',
  aliases: ['suggestions', 'suggestion'],
  category: 'utility',
  help: [
    { name: 'suggest', description: 'Submit a suggestion', aliases: 'suggestions, suggestion', parameters: '(text)', information: 'n/a', usage: 'suggest (text)', example: 'suggest Add more roles' },
    { name: 'suggest set', description: 'Set the suggestion channel', aliases: 'channel', parameters: '(#channel)', information: 'MANAGE_GUILD', usage: 'suggest set (#channel)', example: 'suggest set #suggestions' },
    { name: 'suggest approve', description: 'Approve a suggestion', aliases: 'n/a', parameters: '(message ID) [reason]', information: 'MANAGE_GUILD', usage: 'suggest approve (id) [reason]', example: 'suggest approve 123456 Great idea' },
    { name: 'suggest deny', description: 'Deny a suggestion', aliases: 'decline', parameters: '(message ID) [reason]', information: 'MANAGE_GUILD', usage: 'suggest deny (id) [reason]', example: 'suggest deny 123456 Not feasible' },
    { name: 'suggest consider', description: 'Mark a suggestion as being considered', aliases: 'n/a', parameters: '(message ID) [reason]', information: 'MANAGE_GUILD', usage: 'suggest consider (id)', example: 'suggest consider 123456' },
    { name: 'suggest progress', description: 'Mark a suggestion as in progress', aliases: 'working', parameters: '(message ID)', information: 'MANAGE_GUILD', usage: 'suggest progress (id)', example: 'suggest progress 123456' },
    { name: 'suggest config', description: 'View suggestion settings', aliases: 'configuration', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'suggest config', example: 'suggest config' },
  ],

  run: async (client, message, args) => {
    const prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;
    const sub = (args[0] || '').toLowerCase();
    const gid = message.guild.id;

    const hasPerms = message.member.permissions.has(PermissionFlagsBits.ManageGuild) || message.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!sub) {
      return paginate(message, [
        { name: 'suggest', description: 'Submit a suggestion to the server', aliases: 'suggestions, suggestion', parameters: '(text)', information: 'n/a', usage: `${prefix}suggest (text)`, example: `${prefix}suggest Add more roles` },
        { name: 'suggest set', description: 'Set the suggestion channel', aliases: 'channel', parameters: '(#channel)', information: 'MANAGE_GUILD', usage: `${prefix}suggest set (#channel)`, example: `${prefix}suggest set #suggestions` },
        { name: 'suggest approve', description: 'Approve a suggestion', aliases: 'n/a', parameters: '(message ID) [reason]', information: 'MANAGE_GUILD', usage: `${prefix}suggest approve (id)`, example: `${prefix}suggest approve 123456 Great idea` },
        { name: 'suggest deny', description: 'Deny a suggestion', aliases: 'decline', parameters: '(message ID) [reason]', information: 'MANAGE_GUILD', usage: `${prefix}suggest deny (id)`, example: `${prefix}suggest deny 123456 Not feasible` },
        { name: 'suggest consider', description: 'Mark as being considered', aliases: 'n/a', parameters: '(message ID)', information: 'MANAGE_GUILD', usage: `${prefix}suggest consider (id)`, example: `${prefix}suggest consider 123456` },
        { name: 'suggest progress', description: 'Mark as in progress', aliases: 'working', parameters: '(message ID)', information: 'MANAGE_GUILD', usage: `${prefix}suggest progress (id)`, example: `${prefix}suggest progress 123456` },
      ], 'utility');
    }

    if (['set', 'channel'].includes(sub)) {
      if (!hasPerms) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });
      const ch = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
      if (!ch) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Please mention a valid channel.`)] });
      db.set(`suggest_channel_${gid}`, ch.id);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Suggestion channel set to ${ch}.`)] });
    }

    if (sub === 'review') {
      if (!hasPerms) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });
      const sub2 = (args[1] || '').toLowerCase();
      if (sub2 === 'channel') {
        const ch = message.mentions.channels.first() || message.guild.channels.cache.get(args[2]);
        if (!ch) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Please mention a valid channel.`)] });
        db.set(`suggest_review_channel_${gid}`, ch.id);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Suggestion review channel set to ${ch}.`)] });
      }
      const reviewEnabled = db.get(`suggest_review_${gid}`) || false;
      db.set(`suggest_review_${gid}`, !reviewEnabled);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Suggestion review mode **${!reviewEnabled ? 'enabled' : 'disabled'}**.`)] });
    }

    if (sub === 'reactions') {
      if (!hasPerms) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });
      const current = db.get(`suggest_reactions_${gid}`) ?? true;
      db.set(`suggest_reactions_${gid}`, !current);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Auto-reactions on suggestions **${!current ? 'enabled' : 'disabled'}**.`)] });
    }

    if (['threads', 'thread'].includes(sub)) {
      if (!hasPerms) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });
      const current = db.get(`suggest_threads_${gid}`) || false;
      db.set(`suggest_threads_${gid}`, !current);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Auto-threads on suggestions **${!current ? 'enabled' : 'disabled'}**.`)] });
    }

    if (['lock', 'disable', 'off'].includes(sub)) {
      if (!hasPerms) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });
      db.set(`suggest_locked_${gid}`, true);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Suggestions are now **locked**.`)] });
    }

    if (['unlock', 'enable', 'on'].includes(sub)) {
      if (!hasPerms) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });
      db.set(`suggest_locked_${gid}`, false);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Suggestions are now **unlocked**.`)] });
    }

    if (sub === 'reply') {
      if (!hasPerms) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });
      const msgId = args[1];
      const reply = args.slice(2).join(' ');
      if (!msgId || !reply) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}suggest reply (message ID) (reply)\``)] });
      const channelId = db.get(`suggest_channel_${gid}`);
      if (!channelId) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: No suggestion channel configured.`)] });
      const ch = message.guild.channels.cache.get(channelId);
      if (!ch) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Suggestion channel not found.`)] });
      const msg = await ch.messages.fetch(msgId).catch(() => null);
      if (!msg) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Could not find that suggestion message.`)] });
      const embed = msg.embeds[0] ? EmbedBuilder.from(msg.embeds[0]) : new EmbedBuilder();
      embed.addFields({ name: `Reply from ${message.author.tag}`, value: reply });
      await msg.edit({ embeds: [embed] }).catch(() => null);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Reply added to suggestion.`)] });
    }

    if (sub === 'ignore') {
      if (!hasPerms) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });
      const sub2 = (args[1] || '').toLowerCase();
      const ignoreKey = `suggest_ignore_${gid}`;
      const ignored = db.get(ignoreKey) || [];
      if (sub2 === 'list') {
        if (!ignored.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: No ignored channels or roles.`)] });
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Suggestion Ignores').setDescription(ignored.map(id => `<#${id}> / <@&${id}>`).join('\n'))] });
      }
      const target = message.mentions.channels.first() || message.mentions.roles.first() || message.guild.channels.cache.get(args[1]) || message.guild.roles.cache.get(args[1]);
      if (!target) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Mention a channel or role to ignore.`)] });
      if (ignored.includes(target.id)) {
        db.set(ignoreKey, ignored.filter(id => id !== target.id));
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: ${target} is no longer ignored for suggestions.`)] });
      }
      ignored.push(target.id);
      db.set(ignoreKey, ignored);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: ${target} will now be ignored for suggestions.`)] });
    }

    if (['reset', 'pending'].includes(sub)) {
      if (!hasPerms) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });
      db.delete(`suggest_channel_${gid}`);
      db.delete(`suggest_locked_${gid}`);
      db.delete(`suggest_reactions_${gid}`);
      db.delete(`suggest_threads_${gid}`);
      db.delete(`suggest_review_${gid}`);
      db.delete(`suggest_review_channel_${gid}`);
      db.delete(`suggest_ignore_${gid}`);
      db.delete(`suggest_count_${gid}`);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Suggestion settings have been **reset**.`)] });
    }

    if (['config', 'configuration'].includes(sub)) {
      if (!hasPerms) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });
      const channelId = db.get(`suggest_channel_${gid}`);
      const locked = db.get(`suggest_locked_${gid}`) || false;
      const reactions = db.get(`suggest_reactions_${gid}`) ?? true;
      const threads = db.get(`suggest_threads_${gid}`) || false;
      const review = db.get(`suggest_review_${gid}`) || false;
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color)
        .setTitle('Suggestion Configuration')
        .addFields(
          { name: 'Channel', value: channelId ? `<#${channelId}>` : 'Not set', inline: true },
          { name: 'Locked', value: locked ? 'Yes' : 'No', inline: true },
          { name: 'Reactions', value: reactions ? 'Enabled' : 'Disabled', inline: true },
          { name: 'Threads', value: threads ? 'Enabled' : 'Disabled', inline: true },
          { name: 'Review Mode', value: review ? 'Enabled' : 'Disabled', inline: true },
        )
        .setTimestamp()
      ] });
    }

    async function updateSuggestion(status, statusColor) {
      const msgId = args[1];
      const reason = args.slice(2).join(' ') || 'No reason provided';
      if (!msgId) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Please provide a suggestion message ID.`)] });
      const channelId = db.get(`suggest_channel_${gid}`);
      if (!channelId) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: No suggestion channel configured.`)] });
      const ch = message.guild.channels.cache.get(channelId);
      if (!ch) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Suggestion channel not found.`)] });
      const msg = await ch.messages.fetch(msgId).catch(() => null);
      if (!msg) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Could not find that suggestion.`)] });
      const embed = msg.embeds[0] ? EmbedBuilder.from(msg.embeds[0]) : new EmbedBuilder();
      embed.setColor(statusColor);
      embed.setFooter({ text: `${status} by ${message.author.tag} — ${reason}` });
      await msg.edit({ embeds: [embed] }).catch(() => null);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(statusColor).setDescription(`${approve} ${message.author}: Suggestion has been **${status.toLowerCase()}**.`)] });
    }

    if (sub === 'approve') {
      if (!hasPerms) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });
      return updateSuggestion('Approved', '#a3eb7b');
    }
    if (['deny', 'decline'].includes(sub)) {
      if (!hasPerms) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });
      return updateSuggestion('Denied', '#fe6464');
    }
    if (sub === 'consider') {
      if (!hasPerms) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });
      return updateSuggestion('Considered', '#efa23a');
    }
    if (['progress', 'working'].includes(sub)) {
      if (!hasPerms) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });
      return updateSuggestion('In Progress', '#3498db');
    }

    const locked = db.get(`suggest_locked_${gid}`);
    if (locked) return message.channel.send({ embeds: [new EmbedBuilder().setColor('fe6464').setDescription(`${deny} ${message.author}: Suggestions are currently **locked**.`)] });
    const channelId = db.get(`suggest_channel_${gid}`);
    if (!channelId) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: No suggestion channel has been set. An admin can use \`${prefix}suggest set #channel\`.`)] });
    const ch = message.guild.channels.cache.get(channelId);
    if (!ch) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: The suggestion channel no longer exists.`)] });

    const text = args.join(' ');
    if (!text) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Please provide your suggestion text.`)] });

    const count = (db.get(`suggest_count_${gid}`) || 0) + 1;
    db.set(`suggest_count_${gid}`, count);

    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ forceStatic: false }) })
      .setDescription(text)
      .setFooter({ text: `Suggestion #${count} — Pending` })
      .setTimestamp();

    const sent = await ch.send({ embeds: [embed] }).catch(() => null);
    if (!sent) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Failed to send suggestion.`)] });

    const reactions = db.get(`suggest_reactions_${gid}`) ?? true;
    if (reactions) {
      await sent.react('👍').catch(() => {});
      await sent.react('👎').catch(() => {});
    }

    const threads = db.get(`suggest_threads_${gid}`) || false;
    if (threads) {
      await sent.startThread({ name: `Suggestion #${count}`, autoArchiveDuration: 1440 }).catch(() => {});
    }

    return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Your suggestion has been submitted.`)] });
  }
};

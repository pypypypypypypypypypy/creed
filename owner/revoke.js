const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn, deny, approve } = require('../emojis.json');
const { isOwner, revokeUser, listAuthorizations } = require('../utils/owners');

function resolveUserId(message, raw) {
  if (!raw) return null;
  const mention = message.mentions.users.first();
  if (mention) return mention.id;
  const cleaned = String(raw).replace(/[<@!>]/g, '').trim();
  if (/^\d{15,21}$/.test(cleaned)) return cleaned;
  return null;
}

module.exports = {
  category: 'owner',
  help: [
    {
      name: 'revoke',
      description: '[Owner] Revoke a user\'s access to one owner command, or all of them.',
      aliases: 'unauth, unauthorize',
      parameters: '(user) [command]',
      information: 'Owner-only. Shortcut for `,authorize remove`. Omit the command to revoke ALL of that user\'s authorizations at once.',
      usage: 'revoke (user) [command]',
      example: 'revoke @friend reload',
    },
  ],

  name: 'revoke',
  aliases: ['unauth', 'unauthorize'],

  run: async (client, message, args) => {
    if (!isOwner(message.author.id)) return;

    if (!args[0]) {
      return message.channel.send({ embeds: [
        new EmbedBuilder().setColor(color).setDescription(
          `${warn} ${message.author}: Usage \`,revoke @user [command]\`. Omit the command to revoke everything for that user.`
        ),
      ] });
    }

    const userId = resolveUserId(message, args[0]);
    if (!userId) {
      return message.channel.send({ embeds: [
        new EmbedBuilder().setColor(color).setDescription(`${deny} ${message.author}: Could not resolve a user from \`${args[0]}\`.`),
      ] });
    }
    if (isOwner(userId)) {
      return message.channel.send({ embeds: [
        new EmbedBuilder().setColor(color).setDescription(`${deny} ${message.author}: The owner cannot be revoked.`),
      ] });
    }

    const all = listAuthorizations();
    const current = Array.isArray(all[userId]) ? all[userId] : [];
    if (current.length === 0) {
      return message.channel.send({ embeds: [
        new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: <@${userId}> has no authorizations to revoke.`),
      ] });
    }

    // Single-command revoke
    if (args[1]) {
      const cmdName = String(args[1]).toLowerCase().replace(/^,/, '');
      const ok = revokeUser(userId, cmdName);
      const desc = ok
        ? `${approve} ${message.author}: revoked \`${cmdName}\` from <@${userId}>.`
        : `${warn} ${message.author}: <@${userId}> was not authorized for \`${cmdName}\`.`;
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(desc)] });
    }

    // Revoke ALL
    let removed = 0;
    for (const cmd of current.slice()) {
      if (revokeUser(userId, cmd)) removed++;
    }
    return message.channel.send({ embeds: [
      new EmbedBuilder()
        .setColor(color)
        .setDescription(`${approve} ${message.author}: revoked **${removed}** authorization(s) from <@${userId}> — ${current.map((c) => `\`${c}\``).join(', ')}.`),
    ] });
  },
};

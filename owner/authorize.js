const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn, deny, approve } = require('../emojis.json');
const {
  isOwner,
  authorizeUser,
  revokeUser,
  listAuthorizations,
} = require('../utils/owners');

// Resolve a user from a mention, raw ID, or "<@id>" form.
function resolveUserId(message, raw) {
  if (!raw) return null;
  const mention = message.mentions.users.first();
  if (mention) return mention.id;
  const cleaned = String(raw).replace(/[<@!>]/g, '').trim();
  if (/^\d{15,21}$/.test(cleaned)) return cleaned;
  return null;
}

// Walk the loaded commands collection to confirm a command exists and to
// resolve aliases to canonical names. Falls back to whatever the user typed
// (lowercased) if the bot has not finished registering it.
function resolveCmdName(client, raw) {
  if (!raw) return null;
  const key = String(raw).toLowerCase().replace(/^,/, '');
  if (client.commands && client.commands.has(key)) return key;
  if (client.aliases && client.aliases.has(key)) return client.aliases.get(key);
  return null;
}

function isOwnerCmd(client, name) {
  const cmd = client.commands && client.commands.get(name);
  return Boolean(cmd && cmd.category === 'owner');
}

module.exports = {
  category: 'owner',
  help: [
    {
      name: 'authorize',
      description: '[Owner] Grant or revoke a non-owner permission to use a single owner command.',
      aliases: 'auth',
      parameters: '(user) (command) | remove (user) (command) | list',
      information: 'Owner-only. Grants are persisted to data/authorized.json and apply across restarts. Only commands in the owner category can be authorized.',
      usage: 'authorize (user) (command)',
      example: 'authorize @friend reload',
    },
  ],

  name: 'authorize',
  aliases: ['auth'],

  run: async (client, message, args) => {
    if (!isOwner(message.author.id)) return;

    const sub = (args[0] || '').toLowerCase();

    // ---------- LIST ----------
    if (sub === 'list' || sub === 'ls') {
      const all = listAuthorizations();
      const entries = Object.entries(all);
      if (entries.length === 0) {
        return message.channel.send({ embeds: [
          new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: No authorizations set.`),
        ] });
      }
      const lines = entries.map(([uid, cmds]) => `<@${uid}> (\`${uid}\`) → ${cmds.map((c) => `\`${c}\``).join(', ')}`);
      return message.channel.send({ embeds: [
        new EmbedBuilder()
          .setColor(color)
          .setTitle(`Authorized non-owners (${entries.length})`)
          .setDescription(lines.join('\n').slice(0, 4090)),
      ] });
    }

    // ---------- REMOVE ----------
    if (sub === 'remove' || sub === 'rm' || sub === 'revoke') {
      const userId = resolveUserId(message, args[1]);
      const cmdRaw = args[2];
      if (!userId || !cmdRaw) {
        return message.channel.send({ embeds: [
          new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Usage \`,authorize remove @user (command)\`.`),
        ] });
      }
      const cmdName = resolveCmdName(client, cmdRaw) || String(cmdRaw).toLowerCase();
      const removed = revokeUser(userId, cmdName);
      return message.channel.send({ embeds: [
        new EmbedBuilder().setColor(color).setDescription(
          removed
            ? `${approve} ${message.author}: Revoked \`${cmdName}\` from <@${userId}>.`
            : `${warn} ${message.author}: <@${userId}> was not authorized for \`${cmdName}\`.`
        ),
      ] });
    }

    // ---------- GRANT ----------
    const userId = resolveUserId(message, args[0]);
    const cmdRaw = args[1];
    if (!userId || !cmdRaw) {
      return message.channel.send({ embeds: [
        new EmbedBuilder().setColor(color).setDescription(
          `${warn} ${message.author}: Usage \`,authorize @user (command)\`, \`,authorize remove @user (command)\`, or \`,authorize list\`.`
        ),
      ] });
    }

    if (isOwner(userId)) {
      return message.channel.send({ embeds: [
        new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: That user is already the owner.`),
      ] });
    }

    const cmdName = resolveCmdName(client, cmdRaw);
    if (!cmdName) {
      return message.channel.send({ embeds: [
        new EmbedBuilder().setColor(color).setDescription(`${deny} ${message.author}: Unknown command \`${cmdRaw}\`.`),
      ] });
    }

    if (!isOwnerCmd(client, cmdName)) {
      return message.channel.send({ embeds: [
        new EmbedBuilder().setColor(color).setDescription(`${deny} ${message.author}: \`${cmdName}\` is not an owner command — non-owners can already use it.`),
      ] });
    }

    if (cmdName === 'authorize') {
      return message.channel.send({ embeds: [
        new EmbedBuilder().setColor(color).setDescription(`${deny} ${message.author}: \`authorize\` itself cannot be delegated.`),
      ] });
    }

    const added = authorizeUser(userId, cmdName);
    return message.channel.send({ embeds: [
      new EmbedBuilder().setColor(color).setDescription(
        added
          ? `${approve} ${message.author}: Authorized <@${userId}> to use \`,${cmdName}\`.`
          : `${warn} ${message.author}: <@${userId}> was already authorized for \`${cmdName}\`.`
      ),
    ] });
  },
};

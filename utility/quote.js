const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');

module.exports = {
  category: 'utility',
  help: [
    {
      name: 'quote',
      description: 'Quote a message or text in a stylized embed.',
      aliases: 'q',
      parameters: '[@user] <text> | (reply to a message)',
      information: 'Reply to a message to quote it, or pass a user + text, or just text to quote yourself.',
      usage: 'quote [@user] <text>',
      example: 'quote @bob life is good',
    },
  ],

  name: 'quote',
  aliases: ['q'],

  run: async (client, message, args) => {
    let targetUser = null;
    let text = '';

    // 1) Reply mode — quote the replied-to message
    if (message.reference && message.reference.messageId) {
      const replied = await message.channel.messages
        .fetch(message.reference.messageId)
        .catch(() => null);
      if (replied) {
        targetUser = replied.author;
        text = (replied.content || '').trim();
        if (!text && replied.embeds.length)
          text = replied.embeds[0].description || replied.embeds[0].title || '';
        if (!text && replied.attachments.size)
          text = '[attachment]';
      }
    }

    // 2) Mention + text mode
    if (!targetUser) {
      const mention = message.mentions.users.first();
      if (mention) {
        targetUser = mention;
        text = args
          .filter(a => !a.match(new RegExp(`<@!?${mention.id}>`)))
          .join(' ')
          .trim();
      }
    }

    // 3) Self + text mode
    if (!targetUser) {
      targetUser = message.author;
      text = args.join(' ').trim();
    }

    if (!text) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('#efa23a')
            .setDescription(
              `${warn} ${message.author}: Reply to a message, or provide some text.\n\`\`\`\n,quote some text\n,quote @user some text\n\`\`\``
            ),
        ],
      });
    }

    if (text.length > 500) text = text.slice(0, 500) + '…';

    // Resolve display name
    const member = message.guild
      ? await message.guild.members.fetch(targetUser.id).catch(() => null)
      : null;
    const displayName =
      (member && member.displayName) ||
      targetUser.globalName ||
      targetUser.username;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({
        name: displayName,
        iconURL: targetUser.displayAvatarURL({ forceStatic: false }),
      })
      .setDescription(`>>> ${text}`)
      .setFooter({
        text: `@${targetUser.username}${message.author.id !== targetUser.id ? ` • quoted by ${message.author.tag}` : ''}`,
      })
      .setTimestamp();

    // Delete invoking message if in a guild channel
    if (message.guild) await message.delete().catch(() => {});

    return message.channel.send({ embeds: [embed] });
  },
};

// Keep exports so slashCommands.js doesn't crash on require
module.exports.generateQuoteImage = async ({ text, displayName, username }) => {
  throw new Error('Canvas rendering removed — use embed output instead');
};
module.exports.fetchAvatarBuffer = async () => null;
module.exports.resolveDisplayName = async (guild, user) =>
  user.globalName || user.username;

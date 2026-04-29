const { EmbedBuilder } = require('discord.js');
const db = require('../db');

/**
 * Log a moderation action to the configured mod log channel.
 *
 * Reads the channel id from `logschannel_<guildId>` so it stays in sync
 * with the `,logs channel #channel` configuration command.
 *
 * @param {import('discord.js').Guild} guild
 * @param {object} options
 * @param {string} options.action     e.g. "Ban", "Kick", "Unban", "Mute", "Jail", "Hardban", "Nuke"
 * @param {import('discord.js').User} [options.user]      The punished user (omit for channel-only actions like Nuke)
 * @param {import('discord.js').User} options.moderator   The moderator
 * @param {string} [options.reason]
 * @param {import('discord.js').GuildChannel} [options.channel]  For Nuke / channel actions
 * @param {Date|number} [options.until]   For Mute / Timeout — when the punishment ends
 */
async function logModAction(guild, { action, user, moderator, reason, channel, until }) {
  // Match the key written by the `,logs channel` command.
  const channelId =
    db.get(`logschannel_${guild.id}`) ||
    db.get(`modlog_channel_${guild.id}`);
  if (!channelId) return;

  const logChannel = guild.channels.cache.get(channelId);
  if (!logChannel) return;

  // Increment the guild case counter
  const caseKey = `modlog_case_${guild.id}`;
  const caseNum = (db.get(caseKey) || 0) + 1;
  db.set(caseKey, caseNum);

  const lines = [`**Case #${caseNum} | ${action}**`];

  if (channel) {
    lines.push(`**Channel:** ${channel.name} (${channel.id})`);
  }
  if (user) {
    lines.push(`**User:** ${user.username} (${user.id})`);
  }
  lines.push(`**Moderator:** ${moderator.username} (${moderator.id})`);
  if (until) {
    const ts = Math.floor((until instanceof Date ? until.getTime() : until) / 1000);
    lines.push(`**Timed out until:** <t:${ts}:R>`);
  }
  lines.push(`**Reason:** ${reason || 'No Reason Provided'}`);

  const embed = new EmbedBuilder()
    .setAuthor({ name: '🔒 Modlog Entry' })
    .setTitle('Information')
    .setDescription(lines.join('\n'))
    .setColor(0x2b2d31)
    .setTimestamp();

  await logChannel.send({ embeds: [embed] }).catch(() => {});
}

module.exports = { logModAction };

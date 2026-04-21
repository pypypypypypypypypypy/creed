const { EmbedBuilder } = require('discord.js');
const db = require('../db');

/**
 * Log a moderation action to the configured mod log channel.
 *
 * @param {import('discord.js').Guild} guild
 * @param {object} options
 * @param {string} options.action   e.g. "Ban", "Kick", "Unban", "Mute"
 * @param {import('discord.js').User} options.user        The punished user
 * @param {import('discord.js').User} options.moderator   The moderator
 * @param {string} [options.reason]
 */
async function logModAction(guild, { action, user, moderator, reason }) {
  const channelId = db.get(`modlog_channel_${guild.id}`);
  if (!channelId) return;

  const channel = guild.channels.cache.get(channelId);
  if (!channel) return;

  // Increment the guild case counter
  const caseKey = `modlog_case_${guild.id}`;
  const caseNum = (db.get(caseKey) || 0) + 1;
  db.set(caseKey, caseNum);

  const embed = new EmbedBuilder()
    .setAuthor({ name: '🔒 Modlog Entry' })
    .setTitle('Information')
    .setDescription(
      `**Case #${caseNum} | ${action}**\n` +
      `**User:** ${user.username} (${user.id})\n` +
      `**Moderator:** ${moderator.username} (${moderator.id})\n` +
      `**Reason:** ${reason || 'No Reason Provided'}`
    )
    .setColor(0x2b2d31)
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(() => {});
}

module.exports = { logModAction };

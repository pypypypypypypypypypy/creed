const { EmbedBuilder } = require('discord.js');
const db = require('../db');

const SUPPORT_INVITE = 'https://discord.gg/J2uxnApqfH';

// Keep at most this many error records so the JSON store doesn't grow forever.
const MAX_STORED = 200;

/**
 * Generate a short alphanumeric error code, similar to "ADxOOAO8mXpz9".
 */
function generateErrorCode(length = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

/**
 * Persist the error context so `,errorlookup <code>` can reproduce it later.
 */
function storeErrorRecord(code, record) {
  try {
    db.set(`errcode_${code}`, record);
    const recent = db.get('errcode_recent') || [];
    recent.push(code);
    while (recent.length > MAX_STORED) {
      const oldest = recent.shift();
      try { db.delete(`errcode_${oldest}`); } catch {}
    }
    db.set('errcode_recent', recent);
  } catch (_) {
    // DB write failures shouldn't break the user-facing error response.
  }
}

function getErrorRecord(code) {
  try { return db.get(`errcode_${code}`) || null; } catch { return null; }
}

/**
 * Build the standard "Error occurred while performing command X" embed.
 * Returns { content, embeds, code } ready to pass to message.channel.send / reply.
 *
 * @param {import('discord.js').Message} message
 * @param {string} commandName
 * @param {Error} [err]            The thrown error, captured into the record.
 */
function buildErrorPayload(message, commandName, err) {
  const code = generateErrorCode();

  storeErrorRecord(code, {
    code,
    command: commandName,
    userId: message.author?.id || null,
    userTag: message.author?.tag || message.author?.username || null,
    guildId: message.guild?.id || null,
    guildName: message.guild?.name || null,
    channelId: message.channel?.id || null,
    messageContent: (message.content || '').slice(0, 500),
    timestamp: Date.now(),
    errorName: err?.name || null,
    errorMessage: err?.message || null,
    stack: err?.stack ? String(err.stack).slice(0, 1800) : null,
  });

  const embed = new EmbedBuilder()
    .setColor('#FFFFFF')
    .setDescription(
      `:warning: ${message.author}: Error occurred while performing command ` +
      `**${commandName}**. Use the given error code to report it to the developers in the ` +
      `[support server](${SUPPORT_INVITE})`
    );
  return { content: code, embeds: [embed], code };
}

module.exports = {
  buildErrorPayload,
  generateErrorCode,
  storeErrorRecord,
  getErrorRecord,
  SUPPORT_INVITE,
};

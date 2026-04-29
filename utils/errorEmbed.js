const { EmbedBuilder } = require('discord.js');

const SUPPORT_INVITE = 'https://discord.gg/bX4SDcgfBx';

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
 * Build the standard "Error occurred while performing command X" embed.
 * Returns { content, embeds } ready to pass to message.channel.send / reply.
 *
 * @param {import('discord.js').Message} message
 * @param {string} commandName
 */
function buildErrorPayload(message, commandName) {
  const code = generateErrorCode();
  const embed = new EmbedBuilder()
    .setColor(0xefa23a)
    .setDescription(
      `:warning: ${message.author}: Error occurred while performing command ` +
      `**${commandName}**. Use the given error code to report it to the developers in the ` +
      `[support server](${SUPPORT_INVITE})`
    );
  return { content: code, embeds: [embed], code };
}

module.exports = { buildErrorPayload, generateErrorCode, SUPPORT_INVITE };

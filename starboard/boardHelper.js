// Shared helper for starboard and clownboard
const { EmbedBuilder } = require('discord.js');
const db = require('../db');

const DEFAULTS = {
  starboard: {
    emoji: '⭐',
    threshold: 3,
    locked: false,
    selfstar: false,
    color: '#FFD700',
    jumpurl: true,
    timestamp: true,
    attachments: true,
    ignored: { channels: [], members: [], roles: [] },
    channel: null,
  },
  clownboard: {
    emoji: '🤡',
    threshold: 3,
    locked: false,
    selfstar: false,
    color: '#E74C3C',
    jumpurl: true,
    timestamp: true,
    attachments: true,
    ignored: { channels: [], members: [], roles: [] },
    channel: null,
  },
};

function configKey(type, guildId) { return `${type}_cfg_${guildId}`; }
function postKey(type, guildId, msgId) { return `${type}_post_${guildId}_${msgId}`; }

function getConfig(type, guildId) {
  const saved = db.get(configKey(type, guildId)) || {};
  return Object.assign({}, DEFAULTS[type], saved);
}

function saveConfig(type, guildId, cfg) {
  db.set(configKey(type, guildId), cfg);
}

function resetConfig(type, guildId) {
  db.set(configKey(type, guildId), Object.assign({}, DEFAULTS[type]));
}

function parseSetting(val) {
  if (!val) return null;
  const v = val.toLowerCase();
  if (['on', 'true', 'enable', 'yes'].includes(v)) return true;
  if (['off', 'false', 'disable', 'no'].includes(v)) return false;
  return null;
}

function parseColor(input) {
  const hex = input.replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(hex)) return `#${hex}`;
  const map = { red: '#ff0000', blue: '#0000ff', green: '#00ff00', yellow: '#ffff00', purple: '#800080', orange: '#ff8000', pink: '#ffc0cb', white: '#ffffff', black: '#000000', cyan: '#00ffff', gold: '#ffd700', blurple: '#5865f2' };
  return map[input.toLowerCase()] || null;
}

async function buildBoardEmbed(cfg, message, count, type) {
  const label = type === 'starboard' ? cfg.emoji : cfg.emoji;
  const embed = new EmbedBuilder()
    .setColor(cfg.color)
    .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() });

  if (message.content) embed.setDescription(message.content);

  // Attachment handling
  let imageSet = false;
  if (cfg.attachments) {
    const img = message.attachments.find(a => /\.(png|jpg|jpeg|gif|webp)$/i.test(a.url));
    if (img) { embed.setImage(img.url); imageSet = true; }
    // embeds with images
    if (!imageSet) {
      const embedImg = message.embeds.find(e => e.image || e.thumbnail);
      if (embedImg) embed.setImage((embedImg.image || embedImg.thumbnail).url);
    }
  }

  const footerParts = [`${label} ${count}`, `#${message.channel.name}`];
  embed.setFooter({ text: footerParts.join(' · ') });

  if (cfg.timestamp) embed.setTimestamp(message.createdAt);

  if (cfg.jumpurl) {
    embed.addFields({ name: '\u200B', value: `[Jump to message](${message.url})` });
  }

  return embed;
}

module.exports = {
  DEFAULTS,
  configKey,
  postKey,
  getConfig,
  saveConfig,
  resetConfig,
  parseSetting,
  parseColor,
  buildBoardEmbed,
};

const { EmbedBuilder } = require('discord.js');
const { loadImage, createCanvas } = require('@napi-rs/canvas');
const fetch = require('node-fetch');
const { color: fallbackColor } = require('../config.json');

const DEFAULT_COLOR = fallbackColor || '#FFFFFF';
const REFRESH_INTERVAL = 10 * 60 * 1000;

let currentColor = DEFAULT_COLOR;
let lastAvatarKey = null;
let refreshPromise = null;
let installed = false;
const imageColorCache = new Map();

function isNeutralColor(value) {
  if (typeof value === 'number') return value === 0xffffff;
  if (typeof value !== 'string') return false;

  const normalized = value.trim().toLowerCase();
  return normalized === 'white' || normalized === '#fff' || normalized === '#ffffff';
}

function toHex(red, green, blue) {
  return `#${[red, green, blue]
    .map(channel => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

function avatarAccentColor(data) {
  let weightedRed = 0;
  let weightedGreen = 0;
  let weightedBlue = 0;
  let totalWeight = 0;
  let fallbackRed = 0;
  let fallbackGreen = 0;
  let fallbackBlue = 0;
  let fallbackWeight = 0;

  for (let offset = 0; offset < data.length; offset += 4) {
    const alpha = data[offset + 3] / 255;
    if (alpha < 0.45) continue;

    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    const brightness = (red + green + blue) / (255 * 3);
    const saturation = (Math.max(red, green, blue) - Math.min(red, green, blue)) / 255;

    fallbackRed += red * alpha;
    fallbackGreen += green * alpha;
    fallbackBlue += blue * alpha;
    fallbackWeight += alpha;

    // Give colorful pixels more influence than avatar backgrounds or borders.
    if (brightness < 0.06 || brightness > 0.97) continue;
    const weight = alpha * (0.35 + saturation * 2.5);
    weightedRed += red * weight;
    weightedGreen += green * weight;
    weightedBlue += blue * weight;
    totalWeight += weight;
  }

  if (totalWeight > 0) {
    return toHex(
      weightedRed / totalWeight,
      weightedGreen / totalWeight,
      weightedBlue / totalWeight
    );
  }

  if (fallbackWeight > 0) {
    return toHex(
      fallbackRed / fallbackWeight,
      fallbackGreen / fallbackWeight,
      fallbackBlue / fallbackWeight
    );
  }

  return DEFAULT_COLOR;
}

async function sampleImageURL(imageURL) {
  const response = await fetch(imageURL);
  if (!response.ok) throw new Error(`image fetch failed with ${response.status}`);

  const image = await loadImage(Buffer.from(await response.arrayBuffer()));
  const canvas = createCanvas(64, 64);
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0, 64, 64);
  return avatarAccentColor(context.getImageData(0, 0, 64, 64).data);
}

async function getImageAccentColor(imageURL, fallback = currentColor) {
  if (!imageURL) return fallback;
  if (imageColorCache.has(imageURL)) return imageColorCache.get(imageURL);

  try {
    const sampledColor = await sampleImageURL(imageURL);
    if (imageColorCache.size >= 256) {
      imageColorCache.delete(imageColorCache.keys().next().value);
    }
    imageColorCache.set(imageURL, sampledColor);
    return sampledColor;
  } catch {
    return fallback;
  }
}

async function refreshAvatarColor(client, { force = false } = {}) {
  if (!client?.user) return currentColor;

  const avatarKey = client.user.avatar || client.user.displayAvatarURL({ extension: 'png', size: 128 });
  if (!force && avatarKey === lastAvatarKey) return currentColor;
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const avatarURL = client.user.displayAvatarURL({
        extension: 'png',
        forceStatic: true,
        size: 128,
      });
      currentColor = await sampleImageURL(avatarURL);
      lastAvatarKey = avatarKey;
    } catch {
      // Keep the last successful color if the avatar cannot be fetched.
    } finally {
      refreshPromise = null;
    }
    return currentColor;
  })();

  return refreshPromise;
}

function installDynamicEmbedColors(client) {
  if (!installed) {
    const originalSetColor = EmbedBuilder.prototype.setColor;
    EmbedBuilder.prototype.setColor = function setDynamicColor(value) {
      return originalSetColor.call(this, isNeutralColor(value) ? currentColor : value);
    };
    installed = true;
  }

  if (!client || client.__avatarColorWatcherAttached) return;
  client.__avatarColorWatcherAttached = true;

  client.on('userUpdate', (oldUser, newUser) => {
    if (client.user?.id !== newUser.id || oldUser.avatar === newUser.avatar) return;
    refreshAvatarColor(client, { force: true }).catch(() => {});
  });

  const interval = setInterval(() => {
    refreshAvatarColor(client).catch(() => {});
  }, REFRESH_INTERVAL);
  interval.unref?.();
}

module.exports = {
  installDynamicEmbedColors,
  refreshAvatarColor,
  getImageAccentColor,
  getCurrentColor: () => currentColor,
};
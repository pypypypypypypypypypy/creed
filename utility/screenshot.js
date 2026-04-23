const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const fetch = require('node-fetch');
const db = require('../db');

const APIFLASH_KEY = "9bb6e7e10d844b95ac5436feae296219&wait_until=page_loaded";
const SCREENSHOTMACHINE_KEY = "7a1ded";
const SCREENSHOTAPI_KEY = "E8C16GF-PTAM4QB-QRC2YD6-B9NYM24";

const COUNTER_KEY = '__ss_provider_index';

function pickProvider() {
  const idx = (db.get(COUNTER_KEY) || 0) % 3;
  db.set(COUNTER_KEY, idx + 1);
  return idx;
}

function buildUrl(idx, target) {
  const enc = encodeURIComponent(target);
  if (idx === 0) {
    return `https://api.apiflash.com/v1/urltoimage?access_key=${APIFLASH_KEY}&url=${enc}&format=jpeg&fresh=true&full_page=false&width=1280&height=800&response_type=image`;
  }
  if (idx === 1) {
    return `https://api.screenshotmachine.com?key=${SCREENSHOTMACHINE_KEY}&url=${enc}&dimension=1280x800&format=jpg&cacheLimit=0`;
  }
  return `https://shot.screenshotapi.net/screenshot?token=${SCREENSHOTAPI_KEY}&url=${enc}&output=image&file_type=jpeg&width=1280&height=800`;
}

const PROVIDER_NAMES = ['APIFlash', 'ScreenshotMachine', 'ScreenshotAPI'];

const cooldowns = new Map();

module.exports = {
  category: 'utility',
  help: [
    {
      name: 'screenshot',
      description: 'Take a screenshot of a website',
      aliases: 'ss',
      parameters: '(url)',
      information: 'n/a',
      usage: 'screenshot (url)',
      example: 'screenshot https://google.com',
    },
  ],

  name: 'screenshot',
  aliases: ['ss'],
  category: 'utility',

  run: async (client, message, args) => {
    const now = Date.now();
    const last = cooldowns.get(message.author.id) || 0;
    if (now - last < 5000) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please wait a few seconds before using this again.`)] });
    }
    cooldowns.set(message.author.id, now);

    let target = args[0];
    if (!target) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Provide a URL to screenshot.`)] });
    }
    if (!/^https?:\/\//i.test(target)) target = 'https://' + target;
    try { new URL(target); } catch {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: That isn't a valid URL.`)] });
    }

    const loading = await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`<a:loading:1361068178616090685> ${message.author}: Capturing screenshot...`)] });

    const order = [pickProvider()];
    for (let i = 0; i < 3; i++) if (!order.includes(i)) order.push(i);

    let lastErr = null;
    for (const idx of order) {
      try {
        const res = await fetch(buildUrl(idx, target), { timeout: 20000 });
        if (!res.ok) { lastErr = `${PROVIDER_NAMES[idx]}: ${res.status}`; continue; }
        const ct = res.headers.get('content-type') || '';
        if (!ct.startsWith('image/')) { lastErr = `${PROVIDER_NAMES[idx]}: bad response`; continue; }
        const buf = await res.buffer();
        const att = new AttachmentBuilder(buf, { name: 'screenshot.jpg' });
        const embed = new EmbedBuilder()
          .setColor(color)
          .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
          .setTitle('Screenshot')
          .setDescription(`[${target}](${target})`)
          .setImage('attachment://screenshot.jpg')
          .setFooter({ text: `via ${PROVIDER_NAMES[idx]}` })
          .setTimestamp();
        return loading.edit({ embeds: [embed], files: [att] });
      } catch (e) {
        lastErr = `${PROVIDER_NAMES[idx]}: ${e.message}`;
      }
    }

    return loading.edit({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: All screenshot providers failed. (${lastErr || 'unknown'})`)] });
  },
};

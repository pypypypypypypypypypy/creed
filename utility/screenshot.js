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

const NSFW_DOMAINS = new Set([
  'pornhub.com','xvideos.com','xnxx.com','xhamster.com','redtube.com','youporn.com',
  'spankbang.com','tnaflix.com','porn.com','beeg.com','tube8.com','brazzers.com',
  'bangbros.com','realitykings.com','naughtyamerica.com','digitalplayground.com',
  'manyvids.com','onlyfans.com','fansly.com','chaturbate.com','stripchat.com',
  'cam4.com','myfreecams.com','livejasmin.com','bongacams.com','rule34.xxx',
  'rule34.us','e621.net','e926.net','furaffinity.net','hentaihaven.org',
  'hanime.tv','nhentai.net','hentai-foundry.com','luscious.net','gelbooru.com',
  'danbooru.donmai.us','sankakucomplex.com','redgifs.com','motherless.com',
  'eporner.com','heavy-r.com','pornhd.com','txxx.com','hclips.com','hqporner.com',
  'literotica.com','asstr.org','adult-empire.com','adultfriendfinder.com',
  'thothub.tv','thothub.lol','simpcity.su','coomer.party','coomer.su','kemono.party','kemono.su',
  'sex.com','xvideos2.com','xxx.com','adultdvdempire.com','clips4sale.com',
]);

const NSFW_KEYWORDS = [
  'porn','xxx','nsfw','hentai','sex','adult','erotic','nude','naked','fetish',
  'rta-5042-1996-1400-1577-rta',
];

function isNsfwHost(hostname) {
  const h = hostname.toLowerCase().replace(/^www\./, '');
  if (NSFW_DOMAINS.has(h)) return true;
  for (const d of NSFW_DOMAINS) {
    if (h.endsWith('.' + d)) return true;
  }
  return false;
}

async function isNsfwPage(url) {
  try {
    const u = new URL(url);
    if (isNsfwHost(u.hostname)) return true;
    const res = await fetch(url, {
      timeout: 8000,
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DrownBot/1.0)' },
    });
    if (!res.ok) return false;
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (!ct.includes('text/html')) return false;
    const text = (await res.text()).slice(0, 80000).toLowerCase();
    if (/<meta[^>]+name=["']rating["'][^>]+content=["'](?:adult|mature|rta-5042-1996-1400-1577-rta)["']/i.test(text)) return true;
    const head = text.match(/<head[\s\S]*?<\/head>/i)?.[0] || text.slice(0, 8000);
    let hits = 0;
    for (const kw of NSFW_KEYWORDS) if (head.includes(kw)) hits++;
    return hits >= 2;
  } catch {
    return false;
  }
}

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

    const loading = await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`<a:loading:1496708542676074667> ${message.author}: Capturing screenshot...`)] });

    if (await isNsfwPage(target)) {
      return loading.edit({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: That URL appears to be NSFW. Refusing to capture.`)] });
    }

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

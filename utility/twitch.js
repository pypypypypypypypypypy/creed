const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fetch = require('node-fetch');
const db = require('../db');
const { color } = require('../config.json');
const { buildSocialContainer, fmtK } = require('../utils/socialEmbed');

function getEmojis(){try{delete require.cache[require.resolve('../emojis.json')];return require('../emojis.json');}catch{return{};}}
function ok(message,text){const e=getEmojis();return message.channel.send({embeds:[new EmbedBuilder().setColor('#a3eb7b').setDescription(`${e.approve||'✅'} ${message.author}: ${text}`)]});}
function deny(message,text){const e=getEmojis();return message.channel.send({embeds:[new EmbedBuilder().setColor('#fe6464').setDescription(`${e.deny||'❌'} ${message.author}: ${text}`)]});}
function warn(message,text){const e=getEmojis();return message.channel.send({embeds:[new EmbedBuilder().setColor('#efa23a').setDescription(`${e.warn||'⚠️'} ${message.author}: ${text}`)]});}
function needPerm(message,flag,label){if(!flag)return true;if(message.member.permissions.has(PermissionFlagsBits[flag])||message.member.permissions.has(PermissionFlagsBits.Administrator))return true;warn(message,`You're missing permission: \`${label}\``);return false;}

const TWITCH_ACCENT = 0x9146FF;
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function fetchTwitchChannel(username) {
  try {
    const res = await fetch(`https://www.twitch.tv/${encodeURIComponent(username)}`, {
      headers: { 'User-Agent': BROWSER_UA, 'Accept': 'text/html' },
      timeout: 12000,
      redirect: 'follow',
    });
    if (res.status === 404) return { error: `No Twitch channel found for \`${username}\`.` };
    if (!res.ok) return { error: `Twitch returned \`${res.status}\`.` };

    const html = await res.text();
    const live    = /isLiveBroadcast/.test(html) || /"isLiveBroadcast":true/.test(html);
    const ogTitle = (html.match(/<meta property="og:title" content="([^"]+)"/) || [])[1] || username;
    const ogDesc  = (html.match(/<meta property="og:description" content="([^"]+)"/) || [])[1] || null;
    const ogImg   = (html.match(/<meta property="og:image" content="([^"]+)"/) || [])[1] || null;

    // Extract display name / real name from page title
    const name = ogTitle.replace(/\s*[-–|].*$/, '').trim() || username;

    return { username, name, live, description: ogDesc, image: ogImg };
  } catch (e) {
    return { error: `Could not reach Twitch: ${e.message}` };
  }
}

module.exports = {
  name: 'twitch',
  category: 'utility',
  usage: 'twitch <username>',
  help: [
    { name: 'twitch', description: 'Show info about a Twitch channel.', aliases: 'n/a', parameters: '<username>', information: 'n/a', usage: 'twitch <username>', example: ',twitch shroud' },
  ],

  run: async (client, message, args) => {
    const username = (args[0] || '').trim();
    if (!username) return warn(message, 'Provide a Twitch username. `,twitch shroud`');

    const scanEmoji = '<a:loading:1499216008257339514>';
    const thinking = await message.channel.send({
      embeds: [new EmbedBuilder().setColor(color).setDescription(`${scanEmoji} looking up **${username}** on Twitch..`)],
    });

    const result = await fetchTwitchChannel(username);
    if (result.error) {
      const e = getEmojis();
      return thinking.edit({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${e.warn || '⚠️'} ${message.author}: ${result.error}`)] });
    }

    const channelUrl = `https://www.twitch.tv/${result.username}`;
    const status = result.live ? '🔴 **Live now**' : '⚫ Offline';
    const caption = [
      status,
      result.description ? result.description.slice(0, 400) : null,
    ].filter(Boolean).join('\n');

    const container = buildSocialContainer({
      mediaUrl:     result.image,
      authorAvatar: null,
      authorName:   result.name,
      authorHandle: result.username,
      authorUrl:    channelUrl,
      caption:      caption || null,
      stats:        null,
      linkUrl:      channelUrl,
      linkLabel:    result.live ? 'Watch Live on Twitch' : 'View on Twitch',
      accent:       TWITCH_ACCENT,
    });

    await thinking.delete().catch(() => {});
    return message.channel.send({ components: [container], flags: [1 << 15] });
  },
};

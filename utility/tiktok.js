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
function getChannel(message,args){return message.mentions.channels.first()||message.guild.channels.cache.get(args[0])||null;}

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function isTikTokUrl(s) {
  return /tiktok\.com\//i.test(s) || /^https?:\/\/(vm|vt)\.tiktok/i.test(s);
}

// ---- TikTok post (video) lookup via tikwm API ---------------------------
async function fetchTikTokPost(url) {
  try {
    const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`;
    const res = await fetch(apiUrl, { headers: { 'User-Agent': BROWSER_UA }, timeout: 15000 });
    if (!res.ok) return { error: `API returned \`${res.status}\`.` };
    const json = await res.json();
    if (json.code !== 0 || !json.data) return { error: json.msg || 'Failed to fetch TikTok post.' };
    return { data: json.data };
  } catch (e) {
    return { error: `Could not reach TikTok API: ${e.message}` };
  }
}

function formatCaption(title) {
  if (!title) return '';
  return title.replace(/#([\w\u4e00-\u9fa5]+)/g, (_, tag) =>
    `[#${tag}](https://www.tiktok.com/tag/${encodeURIComponent(tag)})`
  ).slice(0, 1000);
}

function buildPostEmbed(data) {
  const postUrl  = `https://www.tiktok.com/@${data.author.unique_id}/video/${data.id}`;
  const coverUrl = data.origin_cover || data.cover || null;
  const caption  = formatCaption(data.title);
  const stats    =
    `❤️ ${fmtK(data.digg_count)} • 🌐 ${fmtK(data.play_count)} • 💬 ${fmtK(data.comment_count)} • 🔁 ${fmtK(data.share_count)}`;

  return buildSocialContainer({
    mediaUrl:     coverUrl,
    authorAvatar: data.author.avatar,
    authorName:   data.author.nickname,
    authorHandle: data.author.unique_id,
    authorUrl:    `https://www.tiktok.com/@${data.author.unique_id}`,
    caption,
    stats,
    linkUrl:      postUrl,
    linkLabel:    'View on TikTok',
    accent:       0x010101,
  });
}

// ---- TikTok profile lookup ----------------------------------------------
async function fetchTikTokProfile(username) {
  const handle = username.replace(/^@/, '').toLowerCase().trim();
  if (!/^[a-z0-9._]{2,24}$/.test(handle)) return { error: 'Invalid TikTok username.' };

  const url = `https://www.tiktok.com/@${encodeURIComponent(handle)}`;
  let res;
  try {
    res = await fetch(url, {
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 12000,
      redirect: 'follow',
    });
  } catch {
    return { error: 'Could not reach TikTok. Try again in a moment.' };
  }
  if (res.status === 404) return { error: `No TikTok user found for \`@${handle}\`.` };
  if (!res.ok) return { error: `TikTok returned \`${res.status}\`.` };

  const html = await res.text();
  const m = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return { error: 'TikTok blocked the request. Try again later.' };

  let data;
  try { data = JSON.parse(m[1]); } catch { return { error: 'Failed to parse TikTok response.' }; }

  const scope = data?.__DEFAULT_SCOPE__ || data?.['__DEFAULT_SCOPE__'];
  const userDetail = scope?.['webapp.user-detail'];
  if (!userDetail || userDetail.statusCode === 10221)
    return { error: `No TikTok user found for \`@${handle}\`.` };

  const info = userDetail.userInfo;
  if (!info || !info.user) return { error: `No TikTok user found for \`@${handle}\`.` };

  return { user: info.user, stats: info.stats || info.statsV2 || {} };
}

function fmtNum(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '0';
  return v.toLocaleString('en-US');
}

function buildProfileEmbed(profile) {
  const { user, stats } = profile;
  const handle     = user.uniqueId;
  const profileUrl = `https://www.tiktok.com/@${handle}`;
  const avatar     = user.avatarLarger || user.avatarMedium || user.avatarThumb || null;

  const captionParts = [];
  if (user.id)            captionParts.push(`**ID:** \`${user.id}\``);
  if (user.region)        captionParts.push(`**Region:** ${user.region}`);
  if (user.privateAccount) captionParts.push(`**Account:** Private`);
  if (user.signature)     captionParts.push('\n' + user.signature.slice(0, 500));

  const statsLine =
    `**${fmtNum(stats.followerCount)}** Followers • ` +
    `**${fmtNum(stats.followingCount)}** Following • ` +
    `**${fmtNum(stats.heartCount ?? stats.heart)}** Likes • ` +
    `**${fmtNum(stats.videoCount)}** Videos`;

  return buildSocialContainer({
    mediaUrl:     null,
    authorAvatar: avatar,
    authorName:   user.nickname || handle,
    authorHandle: handle,
    authorUrl:    profileUrl,
    caption:      captionParts.join('\n') || null,
    stats:        statsLine,
    linkUrl:      profileUrl,
    linkLabel:    'View on TikTok',
    accent:       0x010101,
  });
}

// ---- Command -------------------------------------------------------------
module.exports = {
  name: 'tiktok',
  category: 'utility',
  aliases: ['tt'],
  usage: 'tiktok <username or url>',
  help: [
    { name: 'tiktok', description: 'Look up a TikTok profile or embed a video post.', aliases: 'tt', parameters: '<username | url>', information: 'Pass a URL to embed the post; pass a username to view the profile.', usage: 'tiktok <username or url>', example: ',tiktok kitten  /  ,tiktok https://www.tiktok.com/@user/video/123' },
    { name: 'tiktok clear', description: 'Reset all tiktok feed configuration.', aliases: 'n/a', parameters: '', information: 'n/a', usage: 'tiktok clear', example: ',tiktok clear' },
    { name: 'tiktok add', description: 'Save a channel for tiktok feed.', aliases: 'n/a', parameters: '<channel>', information: 'n/a', usage: 'tiktok add <channel>', example: ',tiktok add #gen' },
    { name: 'tiktok remove', description: 'Remove a tiktok feed channel.', aliases: 'n/a', parameters: '<channel>', information: 'n/a', usage: 'tiktok remove <channel>', example: ',tiktok remove #gen' },
    { name: 'tiktok list', description: 'List tiktok feed channels.', aliases: 'n/a', parameters: '', information: 'n/a', usage: 'tiktok list', example: ',tiktok list' },
  ],

  run: async (client, message, args) => {
    const sub = (args[0] || '').toLowerCase();

    if (sub === 'clear') {
      if (!needPerm(message, 'ManageChannels', 'manage_channels')) return;
      db.delete(`tiktok_add_${message.guild.id}`);
      return ok(message, `Reset \`tiktok\` configuration.`);
    }
    if (sub === 'add') {
      if (!needPerm(message, 'ManageChannels', 'manage_channels')) return;
      const ch = getChannel(message, args.slice(1));
      if (!ch) return warn(message, 'Provide a valid channel.');
      const list = db.get(`tiktok_add_${message.guild.id}`) || [];
      if (list.includes(ch.id)) return warn(message, `That channel is already in the tiktok list.`);
      list.push(ch.id);
      db.set(`tiktok_add_${message.guild.id}`, list);
      return ok(message, `Added ${ch} to the tiktok list.`);
    }
    if (sub === 'remove') {
      if (!needPerm(message, 'ManageChannels', 'manage_channels')) return;
      const ch = getChannel(message, args.slice(1));
      if (!ch) return warn(message, 'Provide a valid channel.');
      const list = db.get(`tiktok_add_${message.guild.id}`) || [];
      const idx = list.indexOf(ch.id);
      if (idx === -1) return warn(message, `That channel is not in the tiktok list.`);
      list.splice(idx, 1);
      db.set(`tiktok_add_${message.guild.id}`, list);
      return ok(message, `Removed ${ch} from the tiktok list.`);
    }
    if (sub === 'list') {
      const cfg = db.get(`tiktok_add_${message.guild.id}`) || [];
      if (!cfg.length)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`**tiktok list** — no channels configured.`)] });
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`**tiktok list**\n${cfg.map(v => `<#${v}>`).join(', ')}`)] });
    }

    const input = (args[0] || '').trim();
    if (!input) return warn(message, 'Provide a TikTok username or video URL. `,tiktok kitten`');

    const scanEmoji = '<a:loading:1499216008257339514>';

    // ── URL mode — embed the video post ──────────────────────────────────
    if (isTikTokUrl(input)) {
      const thinking = await message.channel.send({
        embeds: [new EmbedBuilder().setColor(color).setDescription(`${scanEmoji} fetching TikTok post..`)],
      });

      const result = await fetchTikTokPost(input);
      if (result.error) {
        const e = getEmojis();
        return thinking.edit({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${e.warn || '⚠️'} ${message.author}: ${result.error}`)] });
      }

      const container = buildPostEmbed(result.data);
      await thinking.delete().catch(() => {});
      return message.channel.send({ components: [container], flags: [1 << 15] });
    }

    // ── Username mode — show profile ──────────────────────────────────────
    const thinking = await message.channel.send({
      embeds: [new EmbedBuilder().setColor(color).setDescription(`${scanEmoji} scanning **@${input.replace(/^@/, '')}**'s TikTok profile..`)],
    });

    const profile = await fetchTikTokProfile(input);
    if (profile.error) {
      const e = getEmojis();
      return thinking.edit({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${e.warn || '⚠️'} ${message.author}: ${profile.error}`)] });
    }

    const container = buildProfileEmbed(profile);
    await thinking.delete().catch(() => {});
    return message.channel.send({ components: [container], flags: [1 << 15] });
  },
};

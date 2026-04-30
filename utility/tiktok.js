const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fetch = require('node-fetch');
const db = require('../db');
const { color } = require('../config.json');

function getEmojis(){try{delete require.cache[require.resolve('../emojis.json')];return require('../emojis.json');}catch{return{};}}
function ok(message,text){const e=getEmojis();return message.channel.send({embeds:[new EmbedBuilder().setColor('#a3eb7b').setDescription(`${e.approve||'✅'} ${message.author}: ${text}`)]});}
function deny(message,text){const e=getEmojis();return message.channel.send({embeds:[new EmbedBuilder().setColor('#fe6464').setDescription(`${e.deny||'❌'} ${message.author}: ${text}`)]});}
function warn(message,text){const e=getEmojis();return message.channel.send({embeds:[new EmbedBuilder().setColor('#efa23a').setDescription(`${e.warn||'⚠️'} ${message.author}: ${text}`)]});}
function needPerm(message,flag,label){if(!flag)return true;if(message.member.permissions.has(PermissionFlagsBits[flag])||message.member.permissions.has(PermissionFlagsBits.Administrator))return true;warn(message,`You're missing permission: \`${label}\``);return false;}
function getChannel(message,args){return message.mentions.channels.first()||message.guild.channels.cache.get(args[0])||null;}

// ---- TikTok profile lookup ----------------------------------------------
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

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
  const m = html.match(
    /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/,
  );
  if (!m) return { error: 'TikTok blocked the request. Try again later.' };

  let data;
  try { data = JSON.parse(m[1]); } catch { return { error: 'Failed to parse TikTok response.' }; }

  const scope = data?.__DEFAULT_SCOPE__ || data?.['__DEFAULT_SCOPE__'];
  const userDetail = scope?.['webapp.user-detail'];
  if (!userDetail || userDetail.statusCode === 10221) {
    return { error: `No TikTok user found for \`@${handle}\`.` };
  }
  const info = userDetail.userInfo;
  if (!info || !info.user) return { error: `No TikTok user found for \`@${handle}\`.` };

  return { user: info.user, stats: info.stats || info.statsV2 || {} };
}

function fmtNum(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '0';
  return v.toLocaleString('en-US');
}

async function buildProfileEmbed(profile) {
  const { user, stats } = profile;
  const handle = user.uniqueId;
  const profileUrl = `https://www.tiktok.com/@${handle}`;
  const avatar = user.avatarLarger || user.avatarMedium || user.avatarThumb || null;

  const lines = [];
  lines.push(`**User:** [${user.nickname || handle}](${profileUrl}) ${user.verified ? '☑️' : ''}`);
  lines.push(`(**[@${handle}](${profileUrl})**)`);
  if (user.id) lines.push(`**ID:** \`${user.id}\``);
  if (user.region) lines.push(`**Region:** ${user.region}`);
  if (user.privateAccount) lines.push(`**Account:** Private`);
  lines.push('');
  lines.push(
    `**${fmtNum(stats.followerCount)}** Followers • ` +
    `**${fmtNum(stats.followingCount)}** Following • ` +
    `**${fmtNum(stats.friendCount ?? 0)}** Friends`,
  );
  lines.push(
    `**${fmtNum(stats.heartCount ?? stats.heart)}** Likes • ` +
    `**${fmtNum(stats.videoCount)}** Videos`,
  );
  if (user.signature) {
    lines.push('');
    lines.push(user.signature.slice(0, 600));
  }

  const e = new EmbedBuilder()
    .setColor(color)
    .setDescription(lines.join('\n'));
  if (avatar) e.setThumbnail(avatar);
  return e;
}

// ---- Command -------------------------------------------------------------
module.exports = {
  name: 'tiktok',
  category: 'utility',
  aliases: ['tt'],
  usage: 'tiktok <username>',
  help: [
    { name: 'tiktok', description: 'Look up a TikTok profile (followers, likes, videos, bio).', aliases: 'tt', parameters: '<username>', information: 'Uses public TikTok web data — no API key required.', usage: 'tiktok <username>', example: ',tiktok kitten' },
    { name: 'tiktok clear', description: 'Reset all tiktok feed configuration in this server.', aliases: 'n/a', parameters: '', information: 'n/a', usage: 'tiktok clear', example: ',tiktok clear' },
    { name: 'tiktok add', description: 'Save a channel for future tiktok feed setup.', aliases: 'n/a', parameters: '<channel>', information: 'n/a', usage: 'tiktok add <channel>', example: ',tiktok add #gen' },
    { name: 'tiktok remove', description: 'Remove a saved tiktok feed channel.', aliases: 'n/a', parameters: '<channel>', information: 'n/a', usage: 'tiktok remove <channel>', example: ',tiktok remove #gen' },
    { name: 'tiktok list', description: 'List saved tiktok feed channels.', aliases: 'n/a', parameters: '', information: 'n/a', usage: 'tiktok list', example: ',tiktok list' },
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
      if (!cfg.length) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor(color).setDescription(`**tiktok list** — no channels configured.`)],
        });
      }
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor(color).setDescription(`**tiktok list**\n${cfg.map(v => `<#${v}>`).join(', ')}`)],
      });
    }

    // Default: profile lookup
    const username = (args[0] || '').trim();
    if (!username) return warn(message, 'Provide a TikTok username. `,tiktok kitten`');

    const scanEmoji = '<a:loading:1499216008257339514>';
    const thinking = await message.channel.send({
      embeds: [new EmbedBuilder().setColor(color).setDescription(`${scanEmoji} scanning **@${username.replace(/^@/, '')}**'s TikTok profile..`)],
    });

    const profile = await fetchTikTokProfile(username);
    if (profile.error) {
      const e = getEmojis();
      return thinking.edit({
        embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${e.warn || '⚠️'} ${message.author}: ${profile.error}`)],
      });
    }

    const embed = await buildProfileEmbed(profile);
    return thinking.edit({ embeds: [embed] });
  },
};

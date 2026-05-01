const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fetch = require('node-fetch');
const db = require('../db');
const { color } = require('../config.json');
const { buildSocialContainer, fmtK } = require('../utils/socialEmbed');

function getEmojis(){try{delete require.cache[require.resolve('../emojis.json')];return require('../emojis.json');}catch{return{};}}
function ok(message,text){const e=getEmojis();return message.channel.send({embeds:[new EmbedBuilder().setColor('#a3eb7b').setDescription(`${e.approve||'✅'} ${message.author}: ${text}`)]});}
function warn(message,text){const e=getEmojis();return message.channel.send({embeds:[new EmbedBuilder().setColor('#efa23a').setDescription(`${e.warn||'⚠️'} ${message.author}: ${text}`)]});}
function needPerm(message,flag,label){if(!flag)return true;if(message.member.permissions.has(PermissionFlagsBits[flag])||message.member.permissions.has(PermissionFlagsBits.Administrator))return true;warn(message,`You're missing permission: \`${label}\``);return false;}
function getChannel(message,args){return message.mentions.channels.first()||message.guild.channels.cache.get(args[0])||null;}

const YT_ACCENT = 0xFF0000;

function isYouTubeUrl(s) {
  return /youtu\.be\/|youtube\.com\/(watch|shorts|v\/)/i.test(s);
}

async function fetchYouTubeVideo(url) {
  try {
    const oembed = `https://noembed.com/embed?url=${encodeURIComponent(url)}`;
    const res = await fetch(oembed, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 });
    if (!res.ok) return { error: `Could not fetch video info (\`${res.status}\`).` };
    const json = await res.json();
    if (json.error) return { error: json.error };
    return { data: json };
  } catch (e) {
    return { error: `Request failed: ${e.message}` };
  }
}

module.exports = {
  name: 'youtube',
  aliases: ['yt'],
  category: 'utility',
  usage: 'youtube <url>',
  help: [
    { name: 'youtube', description: 'Embed a YouTube video by URL.', aliases: 'yt', parameters: '<url>', information: 'Paste any youtube.com/watch or youtu.be link.', usage: 'youtube <url>', example: ',youtube https://youtu.be/dQw4w9WgXcQ' },
    { name: 'youtube list', description: 'List youtube feed channels.', aliases: 'n/a', parameters: '', information: 'n/a', usage: 'youtube list', example: 'youtube list' },
    { name: 'youtube clear', description: 'Reset all youtube feeds.', aliases: 'n/a', parameters: '', information: 'n/a', usage: 'youtube clear', example: 'youtube clear' },
    { name: 'youtube remove', description: 'Remove a channel from the youtube feed.', aliases: 'n/a', parameters: '<channel>', information: 'n/a', usage: 'youtube remove <channel>', example: ',youtube remove #gen' },
    { name: 'youtube add', description: 'Add a channel to the youtube feed.', aliases: 'n/a', parameters: '<channel>', information: 'n/a', usage: 'youtube add <channel>', example: ',youtube add #youtube' },
  ],

  run: async (client, message, args) => {
    const sub = (args[0] || '').toLowerCase();

    if (sub === 'list') {
      if (!needPerm(message, 'ManageChannels', 'manage_channels')) return;
      const cfg = db.get(`youtube_list_${message.guild.id}`);
      if (!cfg || (Array.isArray(cfg) && !cfg.length))
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`**youtube list** — no channels configured.`)] });
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`**youtube list**\n${Array.isArray(cfg) ? cfg.map(v => `<#${v}>`).join(', ') : String(cfg)}`)] });
    }
    if (sub === 'clear') {
      if (!needPerm(message, 'ManageChannels', 'manage_channels')) return;
      db.delete(`youtube_${message.guild.id}`);
      return ok(message, `Reset \`youtube\` configuration.`);
    }
    if (sub === 'remove') {
      if (!needPerm(message, 'ManageChannels', 'manage_channels')) return;
      const ch = getChannel(message, args.slice(1));
      if (!ch) return warn(message, 'Provide a valid channel.');
      const list = db.get(`youtube_add_${message.guild.id}`) || [];
      const idx = list.indexOf(ch.id);
      if (idx === -1) return warn(message, `That channel is not in the youtube list.`);
      list.splice(idx, 1);
      db.set(`youtube_add_${message.guild.id}`, list);
      return ok(message, `Removed ${ch} from the youtube list.`);
    }
    if (sub === 'add') {
      if (!needPerm(message, 'ManageChannels', 'manage_channels')) return;
      const ch = getChannel(message, args.slice(1));
      if (!ch) return warn(message, 'Provide a valid channel.');
      const list = db.get(`youtube_add_${message.guild.id}`) || [];
      if (list.includes(ch.id)) return warn(message, `That channel is already in the youtube list.`);
      list.push(ch.id);
      db.set(`youtube_add_${message.guild.id}`, list);
      return ok(message, `Added ${ch} to the youtube list.`);
    }

    const input = (args[0] || '').trim();
    if (!input) return warn(message, 'Provide a YouTube URL. `,youtube https://youtu.be/...`');
    if (!isYouTubeUrl(input)) return warn(message, 'That doesn\'t look like a YouTube URL.');

    const scanEmoji = '<a:loading:1499216008257339514>';
    const thinking = await message.channel.send({
      embeds: [new EmbedBuilder().setColor(color).setDescription(`${scanEmoji} fetching YouTube video..`)],
    });

    const result = await fetchYouTubeVideo(input);
    if (result.error) {
      const e = getEmojis();
      return thinking.edit({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${e.warn || '⚠️'} ${message.author}: ${result.error}`)] });
    }

    const d = result.data;
    const videoUrl = input.split('&')[0];

    const container = buildSocialContainer({
      mediaUrl:     d.thumbnail_url || null,
      authorAvatar: null,
      authorName:   d.author_name || null,
      authorHandle: null,
      authorUrl:    d.author_url || null,
      caption:      d.title ? `**${d.title}**` : null,
      stats:        null,
      linkUrl:      videoUrl,
      linkLabel:    'Watch on YouTube',
      accent:       YT_ACCENT,
    });

    await thinking.delete().catch(() => {});
    return message.channel.send({ components: [container], flags: [1 << 15] });
  },
};

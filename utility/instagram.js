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

const BROWSER_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const IG_ACCENT = 0xE1306C;

function isInstagramUrl(s) {
  return /instagram\.com\/(p|reel|tv)\//i.test(s);
}

// ── Post lookup via oEmbed ────────────────────────────────────────────────
async function fetchInstagramPost(url) {
  try {
    const endpoint = `https://api.instagram.com/oembed/?url=${encodeURIComponent(url)}&maxwidth=1080&omitscript=1`;
    const res = await fetch(endpoint, { headers: { 'User-Agent': BROWSER_UA }, timeout: 10000 });
    if (!res.ok) return { error: `Instagram returned \`${res.status}\`. The post may be private or deleted.` };
    const json = await res.json();
    return { data: json };
  } catch (e) {
    return { error: `Could not reach Instagram: ${e.message}` };
  }
}

// ── Profile lookup via page scraping → ld+json ───────────────────────────
async function fetchInstagramProfile(username) {
  const handle = username.replace(/^@/, '').trim();
  if (!handle || !/^[\w.]{1,30}$/.test(handle))
    return { error: 'Invalid Instagram username.' };

  try {
    const res = await fetch(`https://www.instagram.com/${encodeURIComponent(handle)}/`, {
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 12000,
      redirect: 'follow',
    });
    if (res.status === 404) return { error: `No Instagram account found for \`@${handle}\`.` };
    if (!res.ok) return { error: `Instagram returned \`${res.status}\`.` };

    const html = await res.text();

    // Extract application/ld+json block (ProfilePage)
    const ldMatch = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g);
    let ldData = null;
    if (ldMatch) {
      for (const block of ldMatch) {
        try {
          const inner = block.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
          const j = JSON.parse(inner);
          if (j['@type'] === 'ProfilePage' || j['@type'] === 'Person') { ldData = j; break; }
        } catch { /* skip */ }
      }
    }

    // Extract og: tags as fallback
    const ogImage   = (html.match(/<meta property="og:image" content="([^"]+)"/) || [])[1] || null;
    const ogDesc    = (html.match(/<meta property="og:description" content="([^"]+)"/) || [])[1] || null;
    const ogTitle   = (html.match(/<meta property="og:title" content="([^"]+)"/) || [])[1] || null;

    // Parse follower count from og:description e.g. "1.2M Followers, 500 Following, 300 Posts"
    let followers = null, following = null, posts = null;
    if (ogDesc) {
      const fm = ogDesc.match(/([\d,.kmKM]+)\s+Followers/i);
      const fw = ogDesc.match(/([\d,.kmKM]+)\s+Following/i);
      const fp = ogDesc.match(/([\d,.kmKM]+)\s+Posts/i);
      if (fm) followers = fm[1];
      if (fw) following = fw[1];
      if (fp) posts = fp[1];
    }

    const name    = ldData?.name || ogTitle?.replace(/ \(@[^)]+\).*/, '') || handle;
    const bio     = ldData?.description || (ogDesc ? ogDesc.replace(/[\d,.]+\s+(Followers|Following|Posts)[^·]*·?/gi, '').trim() : null);
    const avatar  = ldData?.image?.url || ogImage || null;
    const private_ = html.includes('"is_private":true') || html.includes('"isPrivate":true');

    return { handle, name, bio, avatar, followers, following, posts, private: private_ };
  } catch (e) {
    return { error: `Could not reach Instagram: ${e.message}` };
  }
}

function formatCaption(text) {
  if (!text) return '';
  return text.replace(/#([\w]+)/g, (_, tag) =>
    `[#${tag}](https://www.instagram.com/explore/tags/${encodeURIComponent(tag)}/)`
  ).slice(0, 1000);
}

// ── Command ───────────────────────────────────────────────────────────────
module.exports = {
  name: 'instagram',
  aliases: ['ig'],
  category: 'utility',
  usage: 'instagram <username or url>',
  help: [
    { name: 'instagram', description: 'Look up an Instagram profile or embed a post.', aliases: 'ig', parameters: '<username | post url>', information: 'Pass a post URL to embed it; pass a username to view the profile.', usage: 'instagram <username or url>', example: ',instagram therock  /  ,instagram https://www.instagram.com/p/abc123/' },
    { name: 'instagram remove', description: 'Remove a channel from the instagram feed list.', aliases: 'n/a', parameters: '<channel>', information: 'n/a', usage: 'instagram remove <channel>', example: ',instagram remove #gen' },
    { name: 'instagram clear', description: 'Reset all instagram feeds.', aliases: 'n/a', parameters: '', information: 'n/a', usage: 'instagram clear', example: ',instagram clear' },
    { name: 'instagram list', description: 'List instagram feed channels.', aliases: 'n/a', parameters: '', information: 'n/a', usage: 'instagram list', example: ',instagram list' },
    { name: 'instagram add', description: 'Add a channel to the instagram feed list.', aliases: 'n/a', parameters: '<channel>', information: 'n/a', usage: 'instagram add <channel>', example: ',instagram add #gen' },
  ],

  run: async (client, message, args) => {
    const sub = (args[0] || '').toLowerCase();

    if (sub === 'remove') {
      if (!needPerm(message, 'ManageChannels', 'manage_channels')) return;
      const ch = getChannel(message, args.slice(1));
      if (!ch) return warn(message, 'Provide a valid channel.');
      const list = db.get(`instagram_add_${message.guild.id}`) || [];
      const idx = list.indexOf(ch.id);
      if (idx === -1) return warn(message, `That channel is not in the instagram list.`);
      list.splice(idx, 1);
      db.set(`instagram_add_${message.guild.id}`, list);
      return ok(message, `Removed ${ch} from the instagram list.`);
    }
    if (sub === 'clear') {
      if (!needPerm(message, 'ManageChannels', 'manage_channels')) return;
      db.delete(`instagram_${message.guild.id}`);
      return ok(message, `Reset \`instagram\` configuration.`);
    }
    if (sub === 'list') {
      if (!needPerm(message, 'ManageChannels', 'manage_channels')) return;
      const cfg = db.get(`instagram_list_${message.guild.id}`);
      if (!cfg || (Array.isArray(cfg) && cfg.length === 0))
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`**instagram list** — no channels configured.`)] });
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`**instagram list**\n${Array.isArray(cfg) ? cfg.map(v => `<#${v}>`).join(', ') : String(cfg)}`)] });
    }
    if (sub === 'add') {
      if (!needPerm(message, 'ManageChannels', 'manage_channels')) return;
      const ch = getChannel(message, args.slice(1));
      if (!ch) return warn(message, 'Provide a valid channel.');
      const list = db.get(`instagram_add_${message.guild.id}`) || [];
      if (list.includes(ch.id)) return warn(message, `That channel is already in the instagram list.`);
      list.push(ch.id);
      db.set(`instagram_add_${message.guild.id}`, list);
      return ok(message, `Added ${ch} to the instagram list.`);
    }

    const input = (args[0] || '').trim();
    if (!input) return warn(message, 'Provide an Instagram username or post URL. `,instagram therock`');

    const scanEmoji = '<a:loading:1499216008257339514>';

    // ── Post URL mode ─────────────────────────────────────────────────────
    if (isInstagramUrl(input)) {
      const thinking = await message.channel.send({
        embeds: [new EmbedBuilder().setColor(color).setDescription(`${scanEmoji} fetching Instagram post..`)],
      });

      const result = await fetchInstagramPost(input);
      if (result.error) {
        const e = getEmojis();
        return thinking.edit({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${e.warn || '⚠️'} ${message.author}: ${result.error}`)] });
      }

      const d = result.data;
      const container = buildSocialContainer({
        mediaUrl:     d.thumbnail_url || null,
        authorAvatar: null,
        authorName:   d.author_name || null,
        authorHandle: d.author_name ? d.author_name.replace(/^@/, '') : null,
        authorUrl:    d.author_url || `https://www.instagram.com/${d.author_name || ''}/`,
        caption:      formatCaption(d.title || null),
        stats:        null,
        linkUrl:      input.split('?')[0],
        linkLabel:    'View on Instagram',
        accent:       IG_ACCENT,
      });

      await thinking.delete().catch(() => {});
      return message.channel.send({ components: [container], flags: [1 << 15] });
    }

    // ── Username / profile mode ───────────────────────────────────────────
    const thinking = await message.channel.send({
      embeds: [new EmbedBuilder().setColor(color).setDescription(`${scanEmoji} looking up **@${input.replace(/^@/, '')}** on Instagram..`)],
    });

    const profile = await fetchInstagramProfile(input);
    if (profile.error) {
      const e = getEmojis();
      return thinking.edit({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${e.warn || '⚠️'} ${message.author}: ${profile.error}`)] });
    }

    const statsParts = [];
    if (profile.followers) statsParts.push(`**${profile.followers}** Followers`);
    if (profile.following) statsParts.push(`**${profile.following}** Following`);
    if (profile.posts)     statsParts.push(`**${profile.posts}** Posts`);
    if (profile.private)   statsParts.push(`🔒 Private`);

    const container = buildSocialContainer({
      mediaUrl:     null,
      authorAvatar: profile.avatar,
      authorName:   profile.name,
      authorHandle: profile.handle,
      authorUrl:    `https://www.instagram.com/${profile.handle}/`,
      caption:      formatCaption(profile.bio) || null,
      stats:        statsParts.join(' • ') || null,
      linkUrl:      `https://www.instagram.com/${profile.handle}/`,
      linkLabel:    'View on Instagram',
      accent:       IG_ACCENT,
    });

    await thinking.delete().catch(() => {});
    return message.channel.send({ components: [container], flags: [1 << 15] });
  },
};

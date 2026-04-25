const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

function getEmojis() {
  try { delete require.cache[require.resolve('../emojis.json')]; return require('../emojis.json'); }
  catch { return {}; }
}
function deny(message, text) {
  const e = getEmojis();
  return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${e.deny || '❌'} ${message.author}: ${text}`)] });
}
function warn(message, text) {
  const e = getEmojis();
  return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${e.warn || '⚠️'} ${message.author}: ${text}`)] });
}

const UA = 'web:drown-xd-bot:v1.0 (by Discord bot)';

let cachedToken = null;
let cachedExpiry = 0;
async function getRedditToken() {
  const now = Date.now();
  if (cachedToken && now < cachedExpiry) return cachedToken;
  const id = process.env.REDDIT_CLIENT_ID;
  const sec = process.env.REDDIT_CLIENT_SECRET;
  if (!id || !sec) return null;
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': UA,
      Authorization: `Basic ${Buffer.from(`${id}:${sec}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) return null;
  const j = await res.json();
  if (!j.access_token) return null;
  cachedToken = j.access_token;
  cachedExpiry = now + (j.expires_in - 60) * 1000;
  return cachedToken;
}

const SETUP_HELP =
  "Reddit's free anonymous API now blocks server requests. To enable `,reddit`, set up a free Reddit app:\n" +
  '1. Go to <https://www.reddit.com/prefs/apps>\n' +
  '2. Click **Create app** → choose **script** → set redirect to `http://localhost`\n' +
  '3. Copy the client ID (under the app name) and the secret\n' +
  '4. On Railway, add env vars:\n' +
  '   • `REDDIT_CLIENT_ID`\n' +
  '   • `REDDIT_CLIENT_SECRET`\n' +
  '5. Redeploy. Done.';

async function fetchTopPosts(sub, token) {
  const url = `https://oauth.reddit.com/r/${encodeURIComponent(sub)}/top?limit=50&t=day&raw_json=1`;
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 404) throw new Error(`Subreddit \`r/${sub}\` not found.`);
    if (res.status === 403) throw new Error(`\`r/${sub}\` is private or quarantined.`);
    throw new Error(`Reddit returned ${res.status}.`);
  }
  return res.json();
}

module.exports = {
  name: 'reddit',
  category: 'utility',
  usage: 'reddit <subreddit>',
  help: [{
    name: 'reddit',
    description: 'Get a random top post from a subreddit (last 24h)',
    aliases: 'r',
    parameters: '<subreddit>',
    information: 'n/a',
    usage: 'reddit <subreddit>',
    example: 'reddit memes',
  }],
  aliases: ['r'],
  run: async (client, message, args) => {
    const sub = (args[0] || '').replace(/^r\//, '').trim();
    if (!sub) return warn(message, 'Usage: `reddit <subreddit>`');

    const token = await getRedditToken();
    if (!token) return warn(message, SETUP_HELP);

    await message.channel.sendTyping().catch(() => {});

    let json;
    try { json = await fetchTopPosts(sub, token); }
    catch (err) { return deny(message, err.message); }

    let posts = (json.data?.children || [])
      .map(p => p.data)
      .filter(p => p && !p.stickied);

    if (!message.channel.nsfw) posts = posts.filter(p => !p.over_18);
    if (!posts.length) return warn(message, `No posts found in \`r/${sub}\`${!message.channel.nsfw ? ' (NSFW posts hidden in non-NSFW channel)' : ''}.`);

    const p = posts[Math.floor(Math.random() * posts.length)];

    const embed = new EmbedBuilder()
      .setColor('#ff4500')
      .setTitle((p.title || 'Untitled').slice(0, 256))
      .setURL(`https://reddit.com${p.permalink}`)
      .setAuthor({ name: `r/${p.subreddit} • u/${p.author}` })
      .setFooter({ text: `👍 ${p.ups || 0} • 💬 ${p.num_comments || 0}${p.over_18 ? ' • NSFW' : ''}` })
      .setTimestamp(new Date((p.created_utc || 0) * 1000));

    const previewUrl = p.preview?.images?.[0]?.source?.url || p.url_overridden_by_dest || p.url;
    if (previewUrl && /\.(png|jpe?g|gif|webp)(\?|$)/i.test(previewUrl)) {
      embed.setImage(previewUrl);
    } else if (p.thumbnail && /^https?:\/\//.test(p.thumbnail)) {
      embed.setThumbnail(p.thumbnail);
    }

    if (p.selftext && !embed.data.image) {
      embed.setDescription(p.selftext.slice(0, 2000));
    } else if (!embed.data.image && p.url && /^https?:\/\//.test(p.url) && !p.is_self) {
      embed.setDescription(`[Open link](${p.url})`);
    }

    return message.channel.send({ embeds: [embed] });
  },
};

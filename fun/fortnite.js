const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const { color } = require('../config.json');

function getEmojis() {
  try { delete require.cache[require.resolve('../emojis.json')]; return require('../emojis.json'); } catch { return {}; }
}
function warn(message, text) {
  const e = getEmojis();
  return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${e.warn || '⚠️'} ${message.author}: ${text}`)] });
}
function deny(message, text) {
  const e = getEmojis();
  return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${e.deny || '❌'} ${message.author}: ${text}`)] });
}

const FN = 'https://fortnite-api.com';
const UA = 'drown-bot';

function authHeaders() {
  const key = process.env.FORTNITE_API_KEY;
  return key ? { Authorization: key, 'User-Agent': UA } : { 'User-Agent': UA };
}

async function getJson(url, requireAuth = false) {
  if (requireAuth && !process.env.FORTNITE_API_KEY) {
    const e = new Error('Set the env var `FORTNITE_API_KEY` (free key at fortnite-api.com).');
    e.noKey = true;
    throw e;
  }
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      if (body && body.error) detail = ` — ${body.error}`;
    } catch {}
    if (res.status === 401) throw new Error(`Unauthorized (check FORTNITE_API_KEY)${detail}`);
    if (res.status === 403) throw new Error(`Forbidden${detail || ' — likely the player has stats hidden in their privacy settings.'}`);
    if (res.status === 404) throw new Error(`Not found${detail}`);
    throw new Error(`API returned ${res.status}${detail}`);
  }
  return res.json();
}

const SUBCOMMANDS = {
  help: 'Show this menu',
  stats: 'Player stats — `<name> [platform]`',
  shop: "Today's item shop",
  news: 'Current Battle Royale news',
  map: 'Current BR map (image)',
  aes: 'Current AES key + build version',
  cosmetic: 'Search a cosmetic by name — `<query>`',
  creator: 'Support-a-Creator code lookup — `<code>`',
};

const ALIASES = {
  s: 'stats', stat: 'stats', player: 'stats',
  itemshop: 'shop',
  br: 'news',
  cos: 'cosmetic', cosmetics: 'cosmetic', skin: 'cosmetic',
  sac: 'creator', creatorcode: 'creator', code: 'creator',
  build: 'aes', version: 'aes',
  h: 'help', menu: 'help', commands: 'help',
};

async function showHelp(message) {
  const lines = Object.entries(SUBCOMMANDS).map(([cmd, desc]) => `\`,fortnite ${cmd}\` — ${desc}`);
  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: 'Fortnite — Subcommands', iconURL: 'https://fortnite-api.com/assets/logo.png' })
    .setDescription(lines.join('\n'))
    .setFooter({ text: 'Tip: ,fortnite <username> still works as a shortcut for stats.' });
  return message.channel.send({ embeds: [embed] });
}

async function runStats(message, args) {
  const name = args[0];
  const platform = (args[1] || 'epic').toLowerCase();
  if (!name) return warn(message, 'Usage: `,fortnite stats <username> [platform]`');
  let json;
  try {
    json = await getJson(`${FN}/v2/stats/br/v2?name=${encodeURIComponent(name)}&accountType=${platform}`, true);
  } catch (e) { return deny(message, e.noKey ? e.message : `Failed: ${e.message}`); }
  const s = json.data?.stats?.all?.overall;
  if (!s) return warn(message, 'No stats found (the player may have stats hidden).');
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`Fortnite — ${json.data.account.name}`)
    .addFields(
      { name: 'Wins', value: String(s.wins || 0), inline: true },
      { name: 'Kills', value: String(s.kills || 0), inline: true },
      { name: 'K/D', value: String(s.kd || 0), inline: true },
      { name: 'Matches', value: String(s.matches || 0), inline: true },
      { name: 'Win %', value: `${s.winRate || 0}%`, inline: true },
      { name: 'Top 10', value: String(s.top10 || 0), inline: true },
    )
    .setTimestamp();
  return message.channel.send({ embeds: [embed] });
}

async function runShop(message) {
  let json;
  try { json = await getJson(`${FN}/v2/shop?language=en`); }
  catch (e) { return deny(message, `Failed: ${e.message}`); }
  const entries = (json.data?.entries || []).slice(0, 12);
  if (entries.length === 0) return warn(message, 'Shop is empty right now.');
  const lines = entries.map(e => `• **${e.brItems?.[0]?.name || e.bundle?.name || 'Item'}** — ${e.finalPrice} V-Bucks`);
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle("Today's Fortnite Item Shop")
    .setDescription(lines.join('\n'))
    .setFooter({ text: `Showing ${entries.length} of ${json.data?.entries?.length || 0} entries` })
    .setTimestamp();
  return message.channel.send({ embeds: [embed] });
}

async function runNews(message) {
  let json;
  try { json = await getJson(`${FN}/v2/news/br?language=en`); }
  catch (e) { return deny(message, `Failed: ${e.message}`); }
  const news = json.data;
  if (!news) return warn(message, 'No news available.');
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle('Fortnite — Battle Royale News')
    .setImage(news.image)
    .setFooter({ text: `Hash: ${news.hash?.slice(0, 12) || 'n/a'}` })
    .setTimestamp(new Date(news.lastModified || Date.now()));
  return message.channel.send({ embeds: [embed] });
}

async function runMap(message) {
  let json;
  try { json = await getJson(`${FN}/v1/map`); }
  catch (e) { return deny(message, `Failed: ${e.message}`); }
  const map = json.data;
  if (!map?.images?.blank) return warn(message, 'Map data unavailable.');
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle('Fortnite — Current Map')
    .setImage(map.images.pois || map.images.blank)
    .setFooter({ text: `${(map.pois || []).length} named POIs` });
  return message.channel.send({ embeds: [embed] });
}

async function runAes(message) {
  let json;
  try { json = await getJson(`${FN}/v2/aes`, true); }
  catch (e) { return deny(message, e.noKey ? e.message : `Failed: ${e.message}`); }
  const a = json.data;
  if (!a) return warn(message, 'No AES data.');
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle('Fortnite — Build Info')
    .addFields(
      { name: 'Build', value: `\`${a.build || 'unknown'}\``, inline: true },
      { name: 'Main Key', value: `\`${(a.mainKey || '').slice(0, 24)}…\``, inline: false },
      { name: 'Dynamic Keys', value: String((a.dynamicKeys || []).length), inline: true },
    )
    .setTimestamp(new Date(a.updated || Date.now()));
  return message.channel.send({ embeds: [embed] });
}

async function runCosmetic(message, args) {
  const q = args.join(' ').trim();
  if (!q) return warn(message, 'Usage: `,fortnite cosmetic <name>`');
  let json;
  try { json = await getJson(`${FN}/v2/cosmetics/br/search?name=${encodeURIComponent(q)}&matchMethod=contains&language=en`, true); }
  catch (e) { return deny(message, e.noKey ? e.message : `No cosmetic found matching "${q}".`); }
  const c = json.data;
  if (!c) return warn(message, `No cosmetic found matching "${q}".`);
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${c.name}${c.type?.displayValue ? ` — ${c.type.displayValue}` : ''}`)
    .setDescription(c.description || '*No description*')
    .addFields(
      { name: 'Rarity', value: c.rarity?.displayValue || 'Unknown', inline: true },
      { name: 'Series', value: c.series?.value || 'Standard', inline: true },
      { name: 'Set', value: c.set?.value || 'None', inline: true },
      { name: 'Introduced', value: c.introduction?.text || 'Unknown', inline: false },
    );
  if (c.images?.icon) embed.setThumbnail(c.images.icon);
  if (c.images?.featured) embed.setImage(c.images.featured);
  return message.channel.send({ embeds: [embed] });
}

async function runCreator(message, args) {
  const code = args[0];
  if (!code) return warn(message, 'Usage: `,fortnite creator <code>`');
  let json;
  try { json = await getJson(`${FN}/v2/creatorcode?name=${encodeURIComponent(code)}`); }
  catch (e) { return deny(message, `Code "${code}" not found.`); }
  const c = json.data;
  if (!c) return warn(message, `Code "${code}" not found.`);
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`Support-a-Creator — ${c.code}`)
    .addFields(
      { name: 'Account', value: c.account?.name || 'Unknown', inline: true },
      { name: 'Status', value: c.status || 'Unknown', inline: true },
      { name: 'Verified', value: c.verified ? 'Yes' : 'No', inline: true },
    );
  return message.channel.send({ embeds: [embed] });
}

const HANDLERS = {
  help: (m) => showHelp(m),
  stats: (m, a) => runStats(m, a),
  shop: (m) => runShop(m),
  news: (m) => runNews(m),
  map: (m) => runMap(m),
  aes: (m) => runAes(m),
  cosmetic: (m, a) => runCosmetic(m, a),
  creator: (m, a) => runCreator(m, a),
};

module.exports = {
  name: 'fortnite',
  category: 'fun',
  usage: 'fortnite [subcommand] [args]',
  help: [
    { name: 'fortnite', description: 'Fortnite hub — run with no args for the subcommand menu.', aliases: 'fn', parameters: '[subcommand]', information: 'n/a', usage: 'fortnite [subcommand]', example: 'fortnite shop' },
    { name: 'fortnite stats', description: 'Get Fortnite stats for a player.', aliases: 'fn stats', parameters: '<name> [platform]', information: 'n/a', usage: 'fortnite stats <name> [platform]', example: 'fortnite stats Ninja epic' },
    { name: 'fortnite shop', description: "Show today's Fortnite item shop.", aliases: 'fn shop', parameters: 'n/a', information: 'n/a', usage: 'fortnite shop', example: 'fortnite shop' },
    { name: 'fortnite news', description: 'Show the current Battle Royale news image.', aliases: 'fn news', parameters: 'n/a', information: 'n/a', usage: 'fortnite news', example: 'fortnite news' },
    { name: 'fortnite map', description: 'Show the current BR map.', aliases: 'fn map', parameters: 'n/a', information: 'n/a', usage: 'fortnite map', example: 'fortnite map' },
    { name: 'fortnite aes', description: 'Show the current build version + AES key.', aliases: 'fn aes', parameters: 'n/a', information: 'n/a', usage: 'fortnite aes', example: 'fortnite aes' },
    { name: 'fortnite cosmetic', description: 'Search a cosmetic by name.', aliases: 'fn cos', parameters: '<query>', information: 'n/a', usage: 'fortnite cosmetic <query>', example: 'fortnite cosmetic peely' },
    { name: 'fortnite creator', description: 'Look up a Support-a-Creator code.', aliases: 'fn sac', parameters: '<code>', information: 'n/a', usage: 'fortnite creator <code>', example: 'fortnite creator ninja' },
  ],
  aliases: ['fn'],

  run: async (client, message, args) => {
    if (args.length === 0) return showHelp(message);

    const first = args[0].toLowerCase();
    const sub = HANDLERS[first] ? first : (ALIASES[first] && HANDLERS[ALIASES[first]] ? ALIASES[first] : null);

    if (sub) {
      return HANDLERS[sub](message, args.slice(1));
    }

    // Backward compat: ",fortnite Ninja [epic]" → stats lookup
    return runStats(message, args);
  },
};

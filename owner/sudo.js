const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { canRunOwnerCmd } = require('../utils/owners');

// Inventory of every API / external integration the bot uses.
// `keys`     — env-var names that hold the credential (any one being set counts).
// `configKey`— optional fallback inside config.json.
// `belongs`  — short blurb of what the bot uses it for.
const APIS = [
  {
    name: 'Discord (bot gateway)',
    keys: ['DISCORD_TOKEN', 'TOKEN'],
    belongs: 'Bot login token. Read by bleed.js to log the client in to Discord.',
  },
  {
    name: 'GitHub API',
    keys: ['DROWN_GITHUB_TOKEN', 'GITHUB_TOKEN'],
    belongs: 'Auto-pushes emojis.json after ,uploademojis. Repo controlled by `DROWN_GITHUB_OWNER` / `DROWN_GITHUB_REPO` (defaults: abannition / bored-xd).',
  },
  {
    name: 'Spotify Web API',
    keys: ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET'],
    belongs: 'Track / album / artist lookups inside the music + lastfm modules.',
  },
  {
    name: 'Last.fm API',
    keys: ['LASTFM_API_KEY'],
    configKey: 'lfkey',
    belongs: 'Powers the entire ,fm / ,lastfm scrobble system. Falls back to `lfkey` in config.json.',
  },
  {
    name: 'Reddit API',
    keys: ['REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET'],
    belongs: 'OAuth client for ,meme and other Reddit pulls.',
  },
  {
    name: 'Fortnite-API',
    keys: ['FORTNITE_API_KEY'],
    belongs: 'fun/fortnite.js + information/itemshop.js — cosmetic lookups, current item shop.',
  },
  {
    name: 'Lavalink (music nodes)',
    keys: ['LAVALINK_NODES', 'LAVALINK_HOST', 'LAVALINK_PORT', 'LAVALINK_PASSWORD', 'LAVALINK_SECURE'],
    belongs: 'Audio backend for ,play and the rest of the music commands. Falls back to public nodes when nothing is set.',
  },
  {
    name: 'Donation URL',
    keys: ['DONATE_URL'],
    belongs: 'Public donate link shown by ,donate.',
  },
  {
    name: 'TikTok (public scrape)',
    keys: [],
    belongs: 'utility/tiktok.js — no auth, scrapes the public profile JSON.',
  },
  {
    name: 'Roblox API (public)',
    keys: [],
    belongs: 'utility/roblox.js — no auth, public users / profile / friends endpoints.',
  },
  {
    name: 'OpenTDB (public)',
    keys: [],
    belongs: 'fun/trivia.js — no auth, public trivia question API.',
  },
];

function checkPresent(api) {
  if (api.keys.length === 0) return { configured: true, source: 'public api (no credential needed)' };
  for (const k of api.keys) {
    const v = process.env[k];
    if (typeof v === 'string' && v.trim()) return { configured: true, source: `env: \`${k}\`` };
  }
  if (api.configKey) {
    try {
      const cfg = require('../config.json');
      const v = cfg[api.configKey];
      if (typeof v === 'string' && v.trim()) return { configured: true, source: `config.json: \`${api.configKey}\`` };
    } catch {}
  }
  return { configured: false, source: 'not configured' };
}

function renderApiList() {
  const lines = APIS.map((api) => {
    const status = checkPresent(api);
    const icon = status.configured ? '🟢' : '🔴';
    const keys = api.keys.length ? api.keys.map((k) => `\`${k}\``).join(', ') : '*none*';
    const cfg = api.configKey ? ` (or config.json \`${api.configKey}\`)` : '';
    return `${icon} **${api.name}** — ${status.source}\n> Keys: ${keys}${cfg}\n> ${api.belongs}`;
  });
  return lines.join('\n\n');
}

module.exports = {
  category: 'owner',
  help: [
    {
      name: 'sudo api',
      description: 'List every API the bot integrates with, the env vars it reads from, and whether each credential is currently configured.',
      aliases: 'n/a',
      parameters: '<subcommand>',
      information: 'BOT_OWNER. Subcommand `api` is currently the only one.',
      usage: 'sudo api',
      example: 'sudo api',
    },
  ],

  name: 'sudo',
  aliases: [],

  run: async (client, message, args) => {
    if (!canRunOwnerCmd(message.author.id, 'sudo')) return;

    const sub = (args[0] || '').toLowerCase();

    if (sub === 'api' || sub === 'apis') {
      const description = renderApiList();
      const configured = APIS.filter((a) => checkPresent(a).configured).length;
      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`Connected APIs (${configured}/${APIS.length})`)
        .setDescription(description.slice(0, 4090))
        .setFooter({ text: 'Credential values are never displayed — only whether the credential exists.' })
        .setTimestamp();
      return message.channel.send({ embeds: [embed] });
    }

    return message.channel.send({
      embeds: [new EmbedBuilder().setColor(color).setDescription(`Subcommands: \`api\``)],
    });
  },
};

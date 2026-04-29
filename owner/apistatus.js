const { EmbedBuilder } = require('discord.js');
const { color, lfkey } = require('../config.json');
const { canRunOwnerCmd } = require('../utils/owners');

const OK = '🟢';
const BAD = '🔴';

function present(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function any(...values) {
  return values.some(present);
}

module.exports = {
  category: 'owner',
  help: [
    {
      name: 'apistatus',
      description: 'Show a green/red checklist of every required env var and integration.',
      aliases: 'envstatus, integrations',
      parameters: 'n/a',
      information: 'BOT_OWNER',
      usage: 'apistatus',
      example: 'apistatus',
    },
  ],

  name: 'apistatus',
  aliases: ['envstatus', 'integrations'],
  category: 'owner',

  run: async (client, message) => {
    if (!canRunOwnerCmd(message.author.id, 'apistatus')) return;

    const env = process.env;

    const groups = [
      {
        title: 'Discord',
        required: true,
        checks: [
          { label: 'Bot token (DISCORD_TOKEN / TOKEN)', ok: any(env.DISCORD_TOKEN, env.TOKEN) },
        ],
      },
      {
        title: 'GitHub mirror',
        required: false,
        checks: [
          { label: 'Token (DROWN_GITHUB_TOKEN / GITHUB_TOKEN)', ok: any(env.DROWN_GITHUB_TOKEN, env.GITHUB_TOKEN) },
          { label: 'Owner (DROWN_GITHUB_OWNER)', ok: present(env.DROWN_GITHUB_OWNER) },
          { label: 'Repo (DROWN_GITHUB_REPO)', ok: present(env.DROWN_GITHUB_REPO) },
        ],
      },
      {
        title: 'Spotify',
        required: false,
        checks: [
          { label: 'SPOTIFY_CLIENT_ID', ok: present(env.SPOTIFY_CLIENT_ID) },
          { label: 'SPOTIFY_CLIENT_SECRET', ok: present(env.SPOTIFY_CLIENT_SECRET) },
        ],
      },
      {
        title: 'Reddit',
        required: false,
        checks: [
          { label: 'REDDIT_CLIENT_ID', ok: present(env.REDDIT_CLIENT_ID) },
          { label: 'REDDIT_CLIENT_SECRET', ok: present(env.REDDIT_CLIENT_SECRET) },
        ],
      },
      (() => {
        const hasCustom =
          present(env.LAVALINK_NODES) ||
          (present(env.LAVALINK_HOST) && present(env.LAVALINK_PORT) && present(env.LAVALINK_PASSWORD));
        return {
          title: 'Lavalink (music)',
          required: false,
          checks: [
            {
              label: hasCustom
                ? 'Nodes — custom config detected'
                : 'Nodes — using built-in public defaults',
              ok: true,
            },
            { label: 'Custom override (LAVALINK_NODES or HOST+PORT+PASSWORD)', ok: hasCustom, optional: true },
            { label: 'Secure flag (LAVALINK_SECURE)', ok: present(env.LAVALINK_SECURE), optional: true },
          ],
        };
      })(),
      {
        title: 'Last.fm',
        required: false,
        checks: [
          { label: 'API key (config.json → lfkey)', ok: present(lfkey) },
        ],
      },
      {
        title: 'Fortnite',
        required: false,
        checks: [
          { label: 'FORTNITE_API_KEY', ok: present(env.FORTNITE_API_KEY) },
        ],
      },
      {
        title: 'Misc',
        required: false,
        checks: [
          { label: 'DONATE_URL', ok: present(env.DONATE_URL), optional: true },
        ],
      },
    ];

    const lines = [];
    let okCount = 0;
    let badCount = 0;
    let totalCount = 0;
    const missingRequired = [];

    for (const group of groups) {
      lines.push(`**${group.title}**`);
      for (const check of group.checks) {
        const icon = check.ok ? OK : BAD;
        const tag = check.optional ? ' *(optional)*' : '';
        lines.push(`${icon} \`${check.label}\`${tag}`);
        if (!check.optional) {
          totalCount++;
          if (check.ok) okCount++;
          else {
            badCount++;
            if (group.required) missingRequired.push(`${group.title} → ${check.label}`);
          }
        }
      }
      lines.push('');
    }

    const summary = missingRequired.length
      ? `⚠️ Missing required: ${missingRequired.join(', ')}`
      : badCount === 0
        ? 'All integrations live ✅'
        : `${badCount} optional integration(s) not configured`;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('API / Integration Status')
      .setDescription(lines.join('\n'))
      .setFooter({ text: `${okCount}/${totalCount} live · ${summary}` });

    return message.channel.send({ embeds: [embed] });
  },
};

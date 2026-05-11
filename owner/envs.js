const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { approve, warn, deny } = require('../emojis.json');
const { canRunOwnerCmd } = require('../utils/owners');

// Keys that are Railway/system internals — not useful to display
const SYSTEM_PREFIXES = [
  'npm_', 'NODE_', 'PATH', 'HOME', 'USER', 'SHELL', 'LANG', 'LC_',
  'PWD', 'OLDPWD', 'SHLVL', 'LOGNAME', 'HOSTNAME', 'TERM',
  'RAILWAY_STATIC_URL', 'RAILWAY_PUBLIC_DOMAIN', 'RAILWAY_PRIVATE_DOMAIN',
  'RAILWAY_GIT_', 'NIXPKGS_', 'NIX_', 'MANPATH', 'INFOPATH', 'PKG_CONFIG',
];

// Keys that look like real secrets/api keys
const SECRET_PATTERNS = [
  /token/i, /secret/i, /key/i, /password/i, /pass/i, /pwd/i,
  /api/i, /auth/i, /credential/i, /private/i, /dsn/i, /url/i,
];

function isSystem(key) {
  return SYSTEM_PREFIXES.some(p => key.startsWith(p));
}

function isSecret(key) {
  return SECRET_PATTERNS.some(r => r.test(key));
}

function mask(value) {
  if (!value || value.length <= 6) return '••••••';
  return value.slice(0, 4) + '••••' + value.slice(-2);
}

module.exports = {
  name: 'envs',
  aliases: ['railwayvars', 'vars', 'apikeys'],
  category: 'owner',
  help: [
    {
      name: 'envs',
      description: 'DM yourself all Railway environment variables',
      aliases: 'railwayvars, vars, apikeys',
      parameters: 'reveal',
      information: 'BOT_OWNER',
      usage: 'envs [reveal]',
      example: 'envs reveal',
    },
  ],

  run: async (client, message, args) => {
    if (!canRunOwnerCmd(message.author.id, 'envs')) return;

    const reveal = (args[0] || '').toLowerCase() === 'reveal';

    // Collect all env vars, skip pure system noise
    const all = Object.entries(process.env).filter(([k]) => !isSystem(k));

    if (all.length === 0) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: No environment variables found.`)]
      });
    }

    // Sort: secrets/api keys first, then rest
    const secrets = all.filter(([k]) => isSecret(k));
    const rest = all.filter(([k]) => !isSecret(k));
    const sorted = [...secrets, ...rest];

    // Build pages of lines — Discord embeds cap at 4096 chars
    const lines = sorted.map(([k, v]) => {
      const val = reveal ? `\`${v}\`` : (isSecret(k) ? `\`${mask(v)}\`` : `\`${v}\``);
      return `**${k}** — ${val}`;
    });

    const CHUNK = 30;
    const pages = [];
    for (let i = 0; i < lines.length; i += CHUNK) {
      pages.push(lines.slice(i, i + CHUNK));
    }

    try {
      const dm = await message.author.createDM();

      for (let i = 0; i < pages.length; i++) {
        const embed = new EmbedBuilder()
          .setColor(color)
          .setTitle(i === 0 ? `Railway Environment Variables (${sorted.length} total)` : `Railway Env Vars (cont.)`)
          .setDescription(pages[i].join('\n'))
          .setFooter({
            text: reveal
              ? `⚠️ Values revealed — do not share this message`
              : `Values masked — run \`,envs reveal\` to see full values`
          });
        if (i === pages.length - 1) embed.setTimestamp();
        await dm.send({ embeds: [embed] });
      }

      return message.channel.send({
        embeds: [new EmbedBuilder()
          .setColor('#a3eb7b')
          .setDescription(`${approve} ${message.author}: Sent **${sorted.length}** env vars to your DMs.${reveal ? '\n⚠️ Values are revealed — delete the DM after use.' : ''}`)
        ]
      });
    } catch (e) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#ed4245').setDescription(`${deny} ${message.author}: Couldn't DM you — make sure your DMs are open.\n\`\`\`${e.message}\`\`\``)]
      });
    }
  },
};

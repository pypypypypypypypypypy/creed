const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { approve, warn, deny } = require('../emojis.json');
const { canRunOwnerCmd } = require('../utils/owners');

// Everything Railway injects automatically — filter these out
const RAILWAY_AUTO_KEYS = new Set([
  'RAILWAY_STATIC_URL', 'RAILWAY_PUBLIC_DOMAIN', 'RAILWAY_PRIVATE_DOMAIN',
  'RAILWAY_PROJECT_ID', 'RAILWAY_PROJECT_NAME', 'RAILWAY_ENVIRONMENT_ID',
  'RAILWAY_ENVIRONMENT_NAME', 'RAILWAY_SERVICE_ID', 'RAILWAY_SERVICE_NAME',
  'RAILWAY_REPLICA_ID', 'RAILWAY_DEPLOYMENT_ID', 'RAILWAY_SNAPSHOT_ID',
  'RAILWAY_GIT_COMMIT_SHA', 'RAILWAY_GIT_AUTHOR', 'RAILWAY_GIT_BRANCH',
  'RAILWAY_GIT_REPO_NAME', 'RAILWAY_GIT_REPO_OWNER', 'RAILWAY_RUN_UID',
  'RAILWAY_HEALTHCHECK_TIMEOUT_SEC', 'RAILWAY_LOG_TIMESTAMP_FORMAT',
  'PORT', 'NIXPACKS_METADATA',
]);

const SYSTEM_PREFIXES = [
  'npm_', 'NODE_', 'PATH', 'HOME', 'USER', 'SHELL', 'LANG', 'LC_',
  'PWD', 'OLDPWD', 'SHLVL', 'LOGNAME', 'HOSTNAME', 'TERM', 'COLORTERM',
  'NIX_', 'NIXPKGS_', 'MANPATH', 'INFOPATH', 'PKG_CONFIG', 'XDG_',
  'DBUS_', 'DISPLAY', 'EDITOR', 'PAGER', 'LESS', 'LS_COLORS',
];

function isAutoSet(key) {
  if (RAILWAY_AUTO_KEYS.has(key)) return true;
  if (SYSTEM_PREFIXES.some(p => key.startsWith(p))) return true;
  return false;
}

module.exports = {
  name: 'envs',
  aliases: ['railwayvars', 'vars', 'apikeys'],
  category: 'owner',
  help: [
    {
      name: 'envs',
      description: 'DM yourself all your Railway environment variables',
      aliases: 'railwayvars, vars, apikeys',
      parameters: 'n/a',
      information: 'BOT_OWNER',
      usage: 'envs',
      example: 'envs',
    },
  ],

  run: async (client, message, args) => {
    if (!canRunOwnerCmd(message.author.id, 'envs')) return;

    // Only vars the user set themselves
    const userVars = Object.entries(process.env).filter(([k]) => !isAutoSet(k));

    if (userVars.length === 0) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: No custom environment variables found.`)]
      });
    }

    // Format each line — full value wrapped in spoiler tags
    const lines = userVars.map(([k, v]) => `**[${k}]:** ||${v}||`);

    // Split into pages keeping lines whole — never cut a line in half
    const pages = [];
    let current = [];
    let currentLen = 0;
    for (const line of lines) {
      // 4096 char embed description limit, leave buffer
      if (currentLen + line.length + 1 > 3800 && current.length > 0) {
        pages.push(current);
        current = [];
        currentLen = 0;
      }
      current.push(line);
      currentLen += line.length + 1;
    }
    if (current.length > 0) pages.push(current);

    try {
      const dm = await message.author.createDM();

      for (let i = 0; i < pages.length; i++) {
        const embed = new EmbedBuilder()
          .setColor(color)
          .setTitle(i === 0 ? `Your Railway Variables (${userVars.length})` : `Your Railway Variables (cont.)`)
          .setDescription(pages[i].join('\n'))
          .setFooter({ text: 'Click the spoilers to reveal each value' });
        if (i === pages.length - 1) embed.setTimestamp();
        await dm.send({ embeds: [embed] });
      }

      return message.channel.send({
        embeds: [new EmbedBuilder()
          .setColor('#a3eb7b')
          .setDescription(`${approve} ${message.author}: Sent **${userVars.length}** variable(s) to your DMs.`)
        ]
      });
    } catch (e) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#ed4245').setDescription(`${deny} ${message.author}: Couldn't DM you — make sure your DMs are open.\n\`\`\`${e.message}\`\`\``)]
      });
    }
  },
};

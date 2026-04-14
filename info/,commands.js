const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { isOwner } = require('../utils/owners');
const generatedEntries = require('../generatedCommands/missingCommands.json');

const EMBED_DESC_LIMIT = 3900;

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function normalizeCategory(cat) {
  if (!cat) return 'Miscellaneous';
  const map = {
    server: 'Server',
    moderation: 'Moderation',
    information: 'Information',
    utility: 'Utility',
    fun: 'Fun',
    economy: 'Economy',
    lastfm: 'Last.fm',
    security: 'Security',
    giveaways: 'Giveaways',
    giveaway: 'Giveaways',
    starboard: 'Starboard',
    clownboard: 'Starboard',
    roleplay: 'Roleplay',
    reactionrole: 'Reaction Roles',
    reaction: 'Reaction',
    'bump reminder': 'Bump Reminder',
    bumpreminder: 'Bump Reminder',
    sticker: 'Sticker',
    stickymessage: 'Sticky Message',
    emoji: 'Emoji',
    buttonrole: 'Button Roles',
    notify: 'Notify',
    timer: 'Timers',
    timers: 'Timers',
    automod: 'Automod',
    music: 'Music',
    leveling: 'Leveling',
    levels: 'Leveling',
    logs: 'Logs',
    voicemaster: 'VoiceMaster',
    antinuke: 'Antinuke',
    autorole: 'Autorole',
    manipulation: 'Manipulation',
    tickets: 'Tickets',
    snipe: 'Snipe',
    miscellaneous: 'Miscellaneous',
    owner: 'Owner',
    message: 'Message',
  };
  return map[cat.toLowerCase()] || capitalize(cat);
}

function buildCategoryMap(client) {
  const catMap = {};

  function addCmd(cat, rootName, subLine) {
    const category = normalizeCategory(cat || 'Miscellaneous');
    if (!catMap[category]) catMap[category] = {};
    if (!catMap[category][rootName]) catMap[category][rootName] = new Set();
    if (subLine) catMap[category][rootName].add(subLine);
  }

  for (const cmd of client.commands.values()) {
    if (!cmd.name) continue;
    const cat = cmd.category || 'Miscellaneous';
    if (Array.isArray(cmd.help) && cmd.help.length > 1) {
      for (const h of cmd.help) {
        if (!h?.name) continue;
        const parts = h.name.trim().split(/\s+/);
        const root = parts[0];
        const sub = parts.slice(1).join(' ');
        addCmd(cat, root, sub || null);
      }
    } else {
      addCmd(cat, cmd.name, null);
    }
  }

  const genGroups = {};
  for (const entry of generatedEntries) {
    const root = (entry.parts?.[0] || entry.command || '').toLowerCase();
    const sub = (entry.parts || []).slice(1).join(' ');
    const cat = entry.category || 'Miscellaneous';
    if (!genGroups[root]) genGroups[root] = { cat, subs: new Set() };
    if (sub) genGroups[root].subs.add(sub);
  }

  for (const [root, { cat, subs }] of Object.entries(genGroups)) {
    const existing = [...(catMap[normalizeCategory(cat)]?.[root] || [])];
    const merged = new Set([...existing, ...subs]);
    addCmd(cat, root, null);
    for (const s of merged) addCmd(cat, root, s);
  }

  return catMap;
}

function buildEmbeds(catMap, totalCount) {
  const embeds = [];
  const sortedCats = Object.keys(catMap).sort((a, b) => a.localeCompare(b));

  for (const category of sortedCats) {
    const commands = catMap[category];
    const sortedCmds = Object.keys(commands).sort((a, b) => a.localeCompare(b));
    const cmdCount = sortedCmds.length;

    let lines = [];
    let currentDesc = '';
    let pageNum = 1;

    const flush = (isLast) => {
      embeds.push(
        new EmbedBuilder()
          .setColor(color)
          .setTitle(`${category} — ${cmdCount} command${cmdCount !== 1 ? 's' : ''}${!isLast || pageNum > 1 ? ` (continued)` : ''}`)
          .setDescription(currentDesc.trim() || '\u200b')
          .setTimestamp()
      );
      pageNum++;
      currentDesc = '';
      lines = [];
    };

    for (const cmdName of sortedCmds) {
      const subs = [...commands[cmdName]].filter(Boolean).sort((a, b) => a.localeCompare(b));
      let line;
      if (subs.length === 0) {
        line = `,${cmdName}`;
      } else {
        const subStr = subs.map(s => `\`${s}\``).join(' ');
        line = `,${cmdName} — ${subStr}`;
      }

      if (currentDesc.length + line.length + 2 > EMBED_DESC_LIMIT) {
        flush(false);
      }
      currentDesc += line + '\n';
    }

    if (currentDesc.trim()) flush(true);
  }

  const footer = `${totalCount} total commands across ${Object.keys(catMap).length} categories`;
  for (const embed of embeds) {
    embed.setFooter({ text: footer });
  }

  return embeds;
}

function countTotal(client) {
  const names = new Set();
  for (const cmd of client.commands.values()) {
    if (cmd.name) names.add(cmd.name.toLowerCase());
  }
  for (const entry of generatedEntries) {
    const root = (entry.parts?.[0] || entry.command || '').toLowerCase();
    if (root) names.add(root);
  }
  return names.size;
}

module.exports = {
  name: ',commands',
  aliases: [',cmds'],
  category: 'owner',
  help: [
    {
      name: ',commands',
      description: 'List all commands and subcommands grouped by category',
      aliases: ',cmds',
      parameters: 'n/a',
      information: 'BOT_OWNER',
      usage: ',commands',
      example: ',commands',
    },
  ],

  run: async (client, message, args) => {
    if (!isOwner(message.author.id)) return;

    const catMap = buildCategoryMap(client);
    const total = countTotal(client);
    const embeds = buildEmbeds(catMap, total);

    for (let i = 0; i < embeds.length; i += 10) {
      await message.channel.send({ embeds: embeds.slice(i, i + 10) });
    }
  },
};

const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { isOwner } = require('../utils/owners');

module.exports = {
  category: 'owner',
  help: [
    {
        name: 'guildwhitelist',
        description: 'Manage guild whitelist',
        aliases: 'n/a',
        parameters: '(guild id)',
        information: 'BOT_OWNER',
        usage: 'guildwhitelist (guild id)',
        example: 'guildwhitelist guild id'
    },
    {
        name: 'guildwhitelist add',
        description: 'Whitelist a guild',
        aliases: 'n/a',
        parameters: '(guild id)',
        information: 'BOT_OWNER',
        usage: 'guildwhitelist add (guild id)',
        example: 'guildwhitelist add guild'
    },
    {
        name: 'guildwhitelist remove',
        description: 'Remove a guild from whitelist',
        aliases: 'n/a',
        parameters: '(guild id)',
        information: 'BOT_OWNER',
        usage: 'guildwhitelist remove (guild id)',
        example: 'guildwhitelist remove guild'
    },
    {
        name: 'guildwhitelist list',
        description: 'List all whitelisted guilds',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'BOT_OWNER',
        usage: 'guildwhitelist list',
        example: 'guildwhitelist list'
    }
],

    name: 'guildwhitelist',
  aliases: ['gwl', 'serverwl', 'authorizeserver'],
  category: 'owner',

  run: async (client, message, args) => {
    if (!isOwner(message.author.id))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('fe6464').setDescription(`${warn} ${message.author}: This command is restricted to the **bot owner**.`)] });

    const sub = (args[0] || '').toLowerCase();

    if (!sub) {
      const wl = db.get('guild_whitelist') || [];
      return message.channel.send({
        embeds: [new EmbedBuilder()
          .setColor(color)
          .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
          .setTitle('Command: guildwhitelist')
          .setDescription('Manage which servers the bot is allowed to stay in.')
          .addFields(
            { name: '**Aliases**', value: 'gwl, serverwl, authorizeserver', inline: true },
            { name: '**Whitelisted Servers**', value: `${wl.length}`, inline: true },
            {
              name: '**Subcommands**',
              value: [
                '`,guildwhitelist add <guild_id>` — Whitelist a server',
                '`,guildwhitelist remove <guild_id>` — Remove a server from whitelist',
                '`,guildwhitelist list` — List all whitelisted servers',
                '`,guildwhitelist clear` — Clear the entire whitelist',
              ].join('\n')
            }
          )
          .setFooter({ text: 'Module: owner' })
          .setTimestamp()
        ]
      });
    }

    // Add
    if (sub === 'add') {
      const guildId = args[1];
      if (!guildId || !/^\d{17,20}$/.test(guildId))
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Please provide a valid guild ID.`)] });

      const wl = db.get('guild_whitelist') || [];
      if (wl.includes(guildId))
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Server \`${guildId}\` is already whitelisted.`)] });

      wl.push(guildId);
      db.set('guild_whitelist', wl);

      const guild = client.guilds.cache.get(guildId);
      const name = guild ? `**${guild.name}**` : `\`${guildId}\``;
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: ${name} has been added to the guild whitelist.`)] });
    }

    // Remove
    if (sub === 'remove') {
      const guildId = args[1];
      if (!guildId || !/^\d{17,20}$/.test(guildId))
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Please provide a valid guild ID.`)] });

      let wl = db.get('guild_whitelist') || [];
      if (!wl.includes(guildId))
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Server \`${guildId}\` is not on the whitelist.`)] });

      wl = wl.filter(id => id !== guildId);
      db.set('guild_whitelist', wl);

      // If the bot is still in that guild, leave it now
      const guild = client.guilds.cache.get(guildId);
      if (guild) {
        try {
          const guildOwner = await guild.fetchOwner();
          await guildOwner.send({ embeds: [new EmbedBuilder()
            .setColor('fe6464')
            .setTitle('Server Removed from Whitelist')
            .setDescription(`**${client.user.username}** has left **${guild.name}** because it has been removed from the approved whitelist.`)
            .setFooter({ text: `Guild ID: ${guildId}` })
            .setTimestamp()
          ] }).catch(() => {});
        } catch {}
        await guild.leave().catch(() => {});
      }

      const name = guild ? `**${guild.name}**` : `\`${guildId}\``;
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: ${name} has been removed from the guild whitelist${guild ? ' and the bot has left that server' : ''}.`)] });
    }

    // List
    if (sub === 'list') {
      const wl = db.get('guild_whitelist') || [];
      if (!wl.length)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: The guild whitelist is currently empty. The bot will leave every server it joins.`)] });

      const lines = wl.map((id, i) => {
        const guild = client.guilds.cache.get(id);
        return `**${i + 1}.** ${guild ? `${guild.name} — ` : ''}\`${id}\`${guild ? ` (${guild.memberCount} members)` : ''}`;
      });

      return message.channel.send({
        embeds: [new EmbedBuilder()
          .setColor(color)
          .setTitle(`Guild Whitelist — ${wl.length} server${wl.length !== 1 ? 's' : ''}`)
          .setDescription(lines.join('\n'))
          .setFooter({ text: 'Module: owner' })
          .setTimestamp()
        ]
      });
    }

    // Clear
    if (sub === 'clear') {
      db.set('guild_whitelist', []);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: The guild whitelist has been cleared. The bot will now leave all servers.`)] });
    }

    return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Unknown subcommand. Run \`,guildwhitelist\` to see all subcommands.`)] });
  }
};

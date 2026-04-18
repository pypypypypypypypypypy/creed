const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { default_prefix } = require('../config.json');

const SUPPORTED_COMMANDS = [
  'ban', 'unban', 'kick', 'mute', 'unmute', 'warn', 'timeout', 'untimeout',
  'softban', 'tempban', 'hardban', 'jail', 'unjail', 'deafen', 'undeafen',
  'imute', 'iunmute', 'rmute', 'runmute', 'nick', 'role'
];

const VARIABLES = [
  '{user}', '{user.mention}', '{user.name}', '{user.id}', '{user.avatar}',
  '{moderator}', '{moderator.mention}', '{moderator.name}',
  '{guild.name}', '{guild.id}', '{guild.icon}',
  '{reason}', '{duration}', '{case}'
];

module.exports = {
  category: 'configuration',
  help: [
    {
        name: 'invoke',
        description: 'Manage command invoke aliases',
        aliases: 'invokesetup, invokereset',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'invoke',
        example: 'invoke'
    },
    {
        name: 'invoke add',
        description: 'Add a custom command invoke',
        aliases: 'n/a',
        parameters: '(command) (alias)',
        information: 'MANAGE_GUILD',
        usage: 'invoke add (command) (alias)',
        example: 'invoke add command'
    },
    {
        name: 'invoke remove',
        description: 'Remove a custom invoke',
        aliases: 'n/a',
        parameters: '(command) (alias)',
        information: 'MANAGE_GUILD',
        usage: 'invoke remove (command) (alias)',
        example: 'invoke remove command'
    },
    {
        name: 'invoke list',
        description: 'List all custom invokes',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'invoke list',
        example: 'invoke list'
    },
    {
        name: 'invoke reset',
        description: 'Reset all custom invokes',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'invoke reset',
        example: 'invoke reset'
    }
],

    name: 'invoke',
  aliases: ['invokesetup', 'invokereset'],
  category: 'configuration',

  run: async (client, message, args) => {
    const prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;
    const sub = (args[0] || '').toLowerCase();
    const guildId = message.guild.id;

    const hasAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator)
      || message.member.permissions.has(PermissionFlagsBits.ManageGuild);

    if (!sub) {
      const embed = new EmbedBuilder()
        .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
        .setTitle('Command: invoke')
        .setDescription('Customize what the bot sends when moderation commands are used.')
        .addFields(
          { name: '**Aliases**', value: 'invokesetup, invokereset', inline: true },
          { name: '**Parameters**', value: '[subcommand]', inline: true },
          { name: '**Information**', value: 'Requires Administrator', inline: true },
          {
            name: '**Subcommands**',
            value: [
              `\`${prefix}invoke set <command> <message>\` — Set an invoke message`,
              `\`${prefix}invoke set <command> <message> --dm\` — Set a DM message sent to the target`,
              `\`${prefix}invoke view <command>\` — View the invoke message for a command`,
              `\`${prefix}invoke list\` — List all configured invoke messages`,
              `\`${prefix}invoke remove <command>\` — Remove invoke message for a command`,
              `\`${prefix}invoke remove <command> --dm\` — Remove DM invoke message`,
              `\`${prefix}invoke reset\` — Reset all invoke messages`,
              `\`${prefix}invoke variables\` — Show available variables`,
            ].join('\n')
          },
          {
            name: '**Supported Commands**',
            value: SUPPORTED_COMMANDS.map(c => `\`${c}\``).join(', ')
          }
        )
        .setFooter({ text: 'Module: configuration' })
        .setTimestamp()
        .setColor(color);
      return message.channel.send({ embeds: [embed] });
    }

    if (!hasAdmin)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're missing permission: \`manage_guild\``)] });

    // ,invoke set <command> <message> [--dm]
    if (sub === 'set') {
      const cmdName = (args[1] || '').toLowerCase();
      if (!cmdName || !SUPPORTED_COMMANDS.includes(cmdName))
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please provide a valid command name. Supported: ${SUPPORTED_COMMANDS.map(c => `\`${c}\``).join(', ')}`)] });

      const isDm = args.includes('--dm');
      const msgParts = args.slice(2).filter(a => a !== '--dm');
      const msgText = msgParts.join(' ');

      if (!msgText)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please provide a message. Usage: \`${prefix}invoke set <command> <message>\``)] });

      const key = isDm ? `invoke_dm_${guildId}_${cmdName}` : `invoke_${guildId}_${cmdName}`;
      db.set(key, msgText);
      const type = isDm ? 'DM message' : 'channel message';
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Invoke ${type} for \`${cmdName}\` has been set.`)] });
    }

    // ,invoke view <command>
    if (sub === 'view') {
      const cmdName = (args[1] || '').toLowerCase();
      if (!cmdName || !SUPPORTED_COMMANDS.includes(cmdName))
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please provide a valid command name.`)] });

      const channelMsg = db.get(`invoke_${guildId}_${cmdName}`);
      const dmMsg = db.get(`invoke_dm_${guildId}_${cmdName}`);

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`Invoke Message: ${cmdName}`)
        .addFields(
          { name: 'Channel Message', value: channelMsg ? `\`\`\`${channelMsg}\`\`\`` : '*Not set*', inline: false },
          { name: 'DM Message', value: dmMsg ? `\`\`\`${dmMsg}\`\`\`` : '*Not set*', inline: false }
        )
        .setFooter({ text: 'Module: configuration' })
        .setTimestamp();
      return message.channel.send({ embeds: [embed] });
    }

    // ,invoke list
    if (sub === 'list') {
      const configured = [];
      for (const cmd of SUPPORTED_COMMANDS) {
        const ch = db.get(`invoke_${guildId}_${cmd}`);
        const dm = db.get(`invoke_dm_${guildId}_${cmd}`);
        if (ch || dm) {
          const types = [];
          if (ch) types.push('channel');
          if (dm) types.push('DM');
          configured.push(`\`${cmd}\` — ${types.join(', ')}`);
        }
      }

      if (!configured.length)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: No invoke messages are configured. Use \`${prefix}invoke set <command> <message>\` to set one.`)] });

      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Configured Invoke Messages').setDescription(configured.join('\n'))] });
    }

    // ,invoke remove <command> [--dm]
    if (sub === 'remove') {
      const cmdName = (args[1] || '').toLowerCase();
      if (!cmdName || !SUPPORTED_COMMANDS.includes(cmdName))
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please provide a valid command name.`)] });

      const isDm = args.includes('--dm');
      const key = isDm ? `invoke_dm_${guildId}_${cmdName}` : `invoke_${guildId}_${cmdName}`;

      if (!db.get(key))
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: No ${isDm ? 'DM' : 'channel'} invoke message is set for \`${cmdName}\`.`)] });

      db.delete(key);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Invoke ${isDm ? 'DM' : 'channel'} message for \`${cmdName}\` has been removed.`)] });
    }

    // ,invoke reset
    if (sub === 'reset') {
      for (const cmd of SUPPORTED_COMMANDS) {
        db.delete(`invoke_${guildId}_${cmd}`);
        db.delete(`invoke_dm_${guildId}_${cmd}`);
      }
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: All invoke messages have been reset.`)] });
    }

    // ,invoke variables
    if (sub === 'variables') {
      return message.channel.send({
        embeds: [new EmbedBuilder()
          .setColor(color)
          .setTitle('Invoke Variables')
          .setDescription(`These variables are replaced in invoke messages:\n\n${VARIABLES.map(v => `\`${v}\``).join('\n')}`)
          .setFooter({ text: 'Module: configuration' })
          .setTimestamp()
        ]
      });
    }

    if (SUPPORTED_COMMANDS.includes(sub)) {
      const action = sub;
      const type = (args[1] || '').toLowerCase();
      const subsub = (args[2] || '').toLowerCase();

      if (!type || !['dm', 'message', 'msg'].includes(type)) {
        const chMsg = db.get(`invoke_${guildId}_${action}`) || 'Default';
        const dmMsg = db.get(`invoke_dm_${guildId}_${action}`) || 'Default';
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color)
          .setTitle(`Invoke Settings: ${action}`)
          .addFields(
            { name: 'DM Message', value: `\`${dmMsg}\``, inline: true },
            { name: 'Channel Message', value: `\`${chMsg}\``, inline: true }
          )
          .setFooter({ text: `Use ${prefix}invoke ${action} dm/message to configure` })
          .setTimestamp()] });
      }

      const isDm = type === 'dm';
      const key = isDm ? `invoke_dm_${guildId}_${action}` : `invoke_${guildId}_${action}`;
      const label = isDm ? 'DM' : 'channel';

      if (subsub === 'view') {
        const current = db.get(key) || 'Default';
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color)
          .setTitle(`Invoke ${action} — ${label} message`)
          .setDescription(`\`\`\`${current}\`\`\``)
          .addFields({ name: 'Variables', value: '`{user}` `{user.tag}` `{reason}` `{moderator}` `{guild}` `{duration}`' })
          .setTimestamp()] });
      }

      const text = args.slice(2).join(' ');
      if (!text)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Provide a message or use \`${prefix}invoke ${action} ${type} view\` to see the current one.`)] });

      if (text.toLowerCase() === 'none' || text.toLowerCase() === 'default') {
        db.delete(key);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Reset the **${action}** ${label} message to default.`)] });
      }

      db.set(key, text);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Set the **${action}** ${label} message to:\n\`${text}\``)] });
    }

    return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Unknown subcommand. Run \`${prefix}invoke\` to see all available subcommands.`)] });
  }
};

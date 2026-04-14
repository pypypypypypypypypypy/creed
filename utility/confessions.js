const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve, deny } = require('../emojis.json');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'confessions',
        description: 'Manage the confession channel',
        aliases: 'confess',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'confessions',
        example: 'confessions'
    },
    {
        name: 'confessions set',
        description: 'Set the confessions channel',
        aliases: 'n/a',
        parameters: '(channel)',
        information: 'MANAGE_GUILD',
        usage: 'confessions set (channel)',
        example: 'confessions set channel'
    },
    {
        name: 'confessions reset',
        description: 'Reset the confessions channel',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'confessions reset',
        example: 'confessions reset'
    }
],

    name: 'confessions',
  aliases: ['confession', 'confess'],
  category: 'utility',

  run: async (client, message, args) => {
    const prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;
    const sub = (args[0] || '').toLowerCase();
    const guildId = message.guild.id;

    if (!sub) {
      const embed = new EmbedBuilder()
        .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
        .setTitle('Command: confessions')
        .setDescription('Manage the anonymous confession system for your server.')
        .addFields(
          { name: '**Aliases**', value: 'confession, confess', inline: true },
          { name: '**Parameters**', value: '[subcommand]', inline: true },
          { name: '**Information**', value: 'N/A', inline: true },
          {
            name: '**Subcommands**',
            value: [
              `\`${prefix}confessions channel #channel\` — Set the confession channel`,
              `\`${prefix}confessions send <message>\` — Send an anonymous confession`,
              `\`${prefix}confessions mute <confession#>\` — Mute a confession author`,
              `\`${prefix}confessions unmute <confession#>\` — Unmute a confession author`,
              `\`${prefix}confessions unmute all\` — Unmute all muted confession authors`,
              `\`${prefix}confessions blacklist add <word>\` — Add a blacklisted word`,
              `\`${prefix}confessions blacklist remove <word>\` — Remove a blacklisted word`,
              `\`${prefix}confessions blacklist list\` — Show blacklisted words`,
              `\`${prefix}confessions blacklist clear\` — Clear all blacklisted words`,
              `\`${prefix}confessions disable\` — Disable confessions`,
              `\`${prefix}confessions reset\` — Reset all confession data`,
            ].join('\n')
          }
        )
        .setFooter({ text: 'Module: utility' })
        .setTimestamp()
        .setColor(color);
      return message.channel.send({ embeds: [embed] });
    }

    // ,confessions channel #channel — set confession channel
    if (sub === 'channel') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're missing permission: \`manage_guild\``)] });

      const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
      if (!channel || !channel.isTextBased())
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Please mention a valid text channel. Usage: \`${prefix}confessions channel #channel\``)] });

      db.set(`confessions_channel_${guildId}`, channel.id);
      db.set(`confessions_enabled_${guildId}`, true);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Anonymous confessions are now enabled in ${channel}.`)] });
    }

    // ,confessions send <message> — send anonymous confession
    if (sub === 'send') {
      const enabled = db.get(`confessions_enabled_${guildId}`);
      const channelId = db.get(`confessions_channel_${guildId}`);

      if (!enabled || !channelId)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Confessions are not enabled in this server. An admin must run \`${prefix}confessions channel #channel\` first.`)] });

      const muted = db.get(`confessions_muted_${guildId}`) || [];
      if (muted.includes(message.author.id))
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('fe6464').setDescription(`${deny} ${message.author}: You have been muted from sending confessions in this server.`)] });

      const confessionText = args.slice(1).join(' ');
      if (!confessionText)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Please provide a confession message. Usage: \`${prefix}confessions send <message>\``)] });

      const blacklist = db.get(`confessions_blacklist_${guildId}`) || [];
      const lower = confessionText.toLowerCase();
      const hit = blacklist.find(w => lower.includes(w.toLowerCase()));
      if (hit)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('fe6464').setDescription(`${deny} ${message.author}: Your confession contains a blacklisted word.`)] });

      const confessCh = message.guild.channels.cache.get(channelId);
      if (!confessCh)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('fe6464').setDescription(`${deny} ${message.author}: The configured confession channel no longer exists. Please ask an admin to set a new one.`)] });

      const count = (db.get(`confessions_count_${guildId}`) || 0) + 1;
      db.set(`confessions_count_${guildId}`, count);

      const authorMap = db.get(`confessions_authors_${guildId}`) || {};
      authorMap[count] = message.author.id;
      db.set(`confessions_authors_${guildId}`, authorMap);

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`Anonymous Confession #${count}`)
        .setDescription(confessionText)
        .setFooter({ text: `Use ${prefix}confessions mute ${count} to mute this author` })
        .setTimestamp();

      await confessCh.send({ embeds: [embed] });

      try {
        await message.delete();
      } catch {}

      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Your anonymous confession has been sent.`)] })
        .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
    }

    // ,confessions mute <confession#>
    if (sub === 'mute') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're missing permission: \`manage_messages\``)] });

      const num = parseInt(args[1]);
      if (!num || isNaN(num))
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Please provide a confession number. Usage: \`${prefix}confessions mute <confession#>\``)] });

      const authorMap = db.get(`confessions_authors_${guildId}`) || {};
      const userId = authorMap[num];
      if (!userId)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: No confession found with number **#${num}**.`)] });

      const muted = db.get(`confessions_muted_${guildId}`) || [];
      if (muted.includes(userId))
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: The author of confession **#${num}** is already muted.`)] });

      muted.push(userId);
      db.set(`confessions_muted_${guildId}`, muted);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: The author of confession **#${num}** has been muted from sending confessions.`)] });
    }

    // ,confessions unmute <confession#> or all
    if (sub === 'unmute') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're missing permission: \`manage_messages\``)] });

      if ((args[1] || '').toLowerCase() === 'all') {
        db.set(`confessions_muted_${guildId}`, []);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: All muted confession authors have been unmuted.`)] });
      }

      const num = parseInt(args[1]);
      if (!num || isNaN(num))
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Please provide a confession number or \`all\`. Usage: \`${prefix}confessions unmute <confession#|all>\``)] });

      const authorMap = db.get(`confessions_authors_${guildId}`) || {};
      const userId = authorMap[num];
      if (!userId)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: No confession found with number **#${num}**.`)] });

      let muted = db.get(`confessions_muted_${guildId}`) || [];
      if (!muted.includes(userId))
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: The author of confession **#${num}** is not muted.`)] });

      muted = muted.filter(id => id !== userId);
      db.set(`confessions_muted_${guildId}`, muted);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: The author of confession **#${num}** has been unmuted.`)] });
    }

    // ,confessions blacklist add/remove/list/clear
    if (sub === 'blacklist') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're missing permission: \`manage_guild\``)] });

      const action = (args[1] || '').toLowerCase();
      const blacklist = db.get(`confessions_blacklist_${guildId}`) || [];

      if (action === 'list') {
        if (!blacklist.length)
          return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: There are no blacklisted words for confessions.`)] });
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Confession Blacklist').setDescription(blacklist.map(w => `\`${w}\``).join(', '))] });
      }

      if (action === 'clear') {
        db.set(`confessions_blacklist_${guildId}`, []);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Confession blacklist cleared.`)] });
      }

      const word = args.slice(2).join(' ');
      if (!word)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Please provide a word.`)] });

      if (action === 'add') {
        if (blacklist.includes(word.toLowerCase()))
          return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: \`${word}\` is already blacklisted.`)] });
        blacklist.push(word.toLowerCase());
        db.set(`confessions_blacklist_${guildId}`, blacklist);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: \`${word}\` has been added to the confession blacklist.`)] });
      }

      if (action === 'remove') {
        if (!blacklist.includes(word.toLowerCase()))
          return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: \`${word}\` is not in the blacklist.`)] });
        db.set(`confessions_blacklist_${guildId}`, blacklist.filter(w => w !== word.toLowerCase()));
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: \`${word}\` has been removed from the confession blacklist.`)] });
      }

      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Invalid subcommand. Use \`add\`, \`remove\`, \`list\`, or \`clear\`.`)] });
    }

    // ,confessions disable
    if (sub === 'disable') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're missing permission: \`manage_guild\``)] });

      db.set(`confessions_enabled_${guildId}`, false);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Anonymous confessions have been disabled.`)] });
    }

    // ,confessions reset
    if (sub === 'reset') {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're missing permission: \`administrator\``)] });

      db.delete(`confessions_channel_${guildId}`);
      db.delete(`confessions_enabled_${guildId}`);
      db.delete(`confessions_count_${guildId}`);
      db.delete(`confessions_authors_${guildId}`);
      db.delete(`confessions_muted_${guildId}`);
      db.delete(`confessions_blacklist_${guildId}`);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: All confession data has been reset.`)] });
    }

    return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Unknown subcommand. Run \`${prefix}confessions\` to see all available subcommands.`)] });
  }
};

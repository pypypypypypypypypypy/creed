const { EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'thread',
        description: 'Manage threads in the server',
        aliases: 'threads',
        parameters: 'n/a',
        information: 'MANAGE_THREADS',
        usage: 'thread',
        example: 'thread'
    },
    {
        name: 'thread create',
        description: 'Create a new thread',
        aliases: 'n/a',
        parameters: '(name)',
        information: 'MANAGE_THREADS',
        usage: 'thread create (name)',
        example: 'thread create name'
    },
    {
        name: 'thread delete',
        description: 'Delete a thread',
        aliases: 'n/a',
        parameters: '(thread)',
        information: 'MANAGE_THREADS',
        usage: 'thread delete (thread)',
        example: 'thread delete thread'
    },
    {
        name: 'thread lock',
        description: 'Lock a thread',
        aliases: 'n/a',
        parameters: '(thread)',
        information: 'MANAGE_THREADS',
        usage: 'thread lock (thread)',
        example: 'thread lock thread'
    },
    {
        name: 'thread unlock',
        description: 'Unlock a thread',
        aliases: 'n/a',
        parameters: '(thread)',
        information: 'MANAGE_THREADS',
        usage: 'thread unlock (thread)',
        example: 'thread unlock thread'
    }
],

    name: 'thread',
  aliases: ['threads'],
  category: 'utility',

  run: async (client, message, args) => {
    const prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;
    const sub = (args[0] || '').toLowerCase();

    if (!sub) {
      const embed = new EmbedBuilder()
        .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
        .setTitle('Command: thread')
        .setDescription('Manage threads in this server.')
        .addFields(
          { name: '**Aliases**', value: 'threads', inline: true },
          { name: '**Parameters**', value: '[subcommand]', inline: true },
          { name: '**Information**', value: 'Requires Manage Threads permission', inline: true },
          {
            name: '**Subcommands**',
            value: [
              `\`${prefix}thread create <name>\` — Create a new thread in the current channel`,
              `\`${prefix}thread delete\` — Delete the current thread`,
              `\`${prefix}thread archive\` — Archive the current thread`,
              `\`${prefix}thread unarchive\` — Unarchive the current thread`,
              `\`${prefix}thread lock\` — Lock the current thread`,
              `\`${prefix}thread unlock\` — Unlock the current thread`,
              `\`${prefix}thread rename <name>\` — Rename the current thread`,
              `\`${prefix}thread add @user\` — Add a user to the current thread`,
              `\`${prefix}thread remove @user\` — Remove a user from the current thread`,
              `\`${prefix}thread slowmode <seconds>\` — Set thread slowmode`,
            ].join('\n')
          }
        )
        .setFooter({ text: 'Module: utility' })
        .setTimestamp()
        .setColor(color);
      return message.channel.send({ embeds: [embed] });
    }

    const hasManageThreads = message.member.permissions.has(PermissionFlagsBits.ManageThreads);

    // ,thread create <name>
    if (sub === 'watch') {
      const action = args[1]?.toLowerCase();
      const key = `thread_watch_${message.guild.id}`;
      const watched = db.get(key) || [];
      if (action === 'list') return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Watched Threads').setDescription(watched.length ? watched.map(id => `<#${id}>`).join('\n') : 'No watched threads.')] });
      const id = message.channel.isThread() ? message.channel.id : args[1];
      if (!id) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Run this inside a thread or provide a thread id.`)] });
      if (watched.includes(id)) db.set(key, watched.filter(x => x !== id));
      else db.set(key, [...watched, id]);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Thread watch toggled for <#${id}>.`)] });
    }

    if (['create', 'add'].includes(sub)) {
      if (!hasManageThreads && !message.member.permissions.has(PermissionFlagsBits.CreatePublicThreads))
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're missing permission: \`create_public_threads\``)] });

      const name = args.slice(1).join(' ');
      if (!name)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Please provide a thread name. Usage: \`${prefix}thread create <name>\``)] });

      if (!message.channel.isTextBased() || message.channel.isThread())
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You can only create threads in a text channel.`)] });

      try {
        const thread = await message.channel.threads.create({
          name,
          autoArchiveDuration: 1440,
          type: ChannelType.PublicThread,
          reason: `Thread created by ${message.author.tag}`,
        });
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Thread ${thread} has been created.`)] });
      } catch (e) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('fe6464').setDescription(`${warn} ${message.author}: Failed to create thread: ${e.message}`)] });
      }
    }

    // ,thread delete
    if (['delete', 'remove'].includes(sub)) {
      if (!hasManageThreads)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're missing permission: \`manage_threads\``)] });

      if (!message.channel.isThread())
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You must run this command inside a thread.`)] });

      await message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Deleting this thread...`)] });
      return message.channel.delete().catch(() => {});
    }

    // ,thread archive
    if (sub === 'archive') {
      if (!hasManageThreads)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're missing permission: \`manage_threads\``)] });

      if (!message.channel.isThread())
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You must run this command inside a thread.`)] });

      try {
        await message.channel.setArchived(true, `Archived by ${message.author.tag}`);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: This thread has been archived.`)] });
      } catch (e) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('fe6464').setDescription(`${warn} ${message.author}: Failed to archive thread: ${e.message}`)] });
      }
    }

    // ,thread unarchive
    if (sub === 'unarchive') {
      if (!hasManageThreads)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're missing permission: \`manage_threads\``)] });

      if (!message.channel.isThread())
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You must run this command inside a thread.`)] });

      try {
        await message.channel.setArchived(false, `Unarchived by ${message.author.tag}`);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: This thread has been unarchived.`)] });
      } catch (e) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('fe6464').setDescription(`${warn} ${message.author}: Failed to unarchive thread: ${e.message}`)] });
      }
    }

    // ,thread lock
    if (sub === 'lock') {
      if (!hasManageThreads)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're missing permission: \`manage_threads\``)] });

      if (!message.channel.isThread())
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You must run this command inside a thread.`)] });

      try {
        await message.channel.setLocked(true, `Locked by ${message.author.tag}`);
        await message.channel.setArchived(true, `Locked by ${message.author.tag}`);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: This thread has been locked.`)] });
      } catch (e) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('fe6464').setDescription(`${warn} ${message.author}: Failed to lock thread: ${e.message}`)] });
      }
    }

    // ,thread unlock
    if (sub === 'unlock') {
      if (!hasManageThreads)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're missing permission: \`manage_threads\``)] });

      if (!message.channel.isThread())
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You must run this command inside a thread.`)] });

      try {
        await message.channel.setArchived(false, `Unlocked by ${message.author.tag}`);
        await message.channel.setLocked(false, `Unlocked by ${message.author.tag}`);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: This thread has been unlocked.`)] });
      } catch (e) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('fe6464').setDescription(`${warn} ${message.author}: Failed to unlock thread: ${e.message}`)] });
      }
    }

    // ,thread rename <name>
    if (sub === 'rename') {
      if (!hasManageThreads)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're missing permission: \`manage_threads\``)] });

      if (!message.channel.isThread())
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You must run this command inside a thread.`)] });

      const name = args.slice(1).join(' ');
      if (!name)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Please provide a new name. Usage: \`${prefix}thread rename <name>\``)] });

      try {
        await message.channel.setName(name, `Renamed by ${message.author.tag}`);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Thread renamed to **${name}**.`)] });
      } catch (e) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('fe6464').setDescription(`${warn} ${message.author}: Failed to rename thread: ${e.message}`)] });
      }
    }

    // ,thread add @user
    if (sub === 'add') {
      if (!message.channel.isThread())
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You must run this command inside a thread.`)] });

      const target = message.mentions.members.first() || message.guild.members.cache.get(args[1]);
      if (!target)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Please mention a user. Usage: \`${prefix}thread add @user\``)] });

      try {
        await message.channel.members.add(target.id);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: ${target} has been added to this thread.`)] });
      } catch (e) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('fe6464').setDescription(`${warn} ${message.author}: Failed to add user: ${e.message}`)] });
      }
    }

    // ,thread remove @user
    if (sub === 'remove') {
      if (!message.channel.isThread())
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You must run this command inside a thread.`)] });

      if (!hasManageThreads && message.author.id !== message.channel.ownerId)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You need \`manage_threads\` or must be the thread owner.`)] });

      const target = message.mentions.members.first() || message.guild.members.cache.get(args[1]);
      if (!target)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Please mention a user. Usage: \`${prefix}thread remove @user\``)] });

      try {
        await message.channel.members.remove(target.id);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: ${target} has been removed from this thread.`)] });
      } catch (e) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('fe6464').setDescription(`${warn} ${message.author}: Failed to remove user: ${e.message}`)] });
      }
    }

    // ,thread slowmode <seconds>
    if (sub === 'slowmode') {
      if (!hasManageThreads)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're missing permission: \`manage_threads\``)] });

      if (!message.channel.isThread())
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You must run this command inside a thread.`)] });

      const seconds = parseInt(args[1]);
      if (isNaN(seconds) || seconds < 0 || seconds > 21600)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Please provide a valid duration in seconds (0–21600). Usage: \`${prefix}thread slowmode <seconds>\``)] });

      try {
        await message.channel.setRateLimitPerUser(seconds, `Set by ${message.author.tag}`);
        const label = seconds === 0 ? 'disabled' : `set to **${seconds}s**`;
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Thread slowmode ${label}.`)] });
      } catch (e) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('fe6464').setDescription(`${warn} ${message.author}: Failed to set slowmode: ${e.message}`)] });
      }
    }

    return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Unknown subcommand. Run \`${prefix}thread\` to see all available subcommands.`)] });
  }
};

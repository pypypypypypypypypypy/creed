const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const { isOwner, listAuthorizations, ownerIds } = require('../utils/owners');

module.exports = {
  category: 'owner',
  help: [
    {
      name: 'adminlist',
      description: '[Owner] List the bot owner and every user with delegated owner-command access.',
      aliases: 'admins, authlist',
      parameters: 'n/a',
      information: 'Owner-only. Reads from data/authorized.json — same source `,authorize` writes to.',
      usage: 'adminlist',
      example: 'adminlist',
    },
  ],

  name: 'adminlist',
  aliases: ['admins', 'authlist'],

  run: async (client, message, args) => {
    if (!isOwner(message.author.id)) return;

    const all = listAuthorizations();
    const authEntries = Object.entries(all);

    const ownerLines = Array.from(ownerIds).map((id) => `\u{1F451} <@${id}> (\`${id}\`) \u2014 *full owner*`);
    const authLines = authEntries.length
      ? authEntries.map(([uid, cmds]) => `\u2022 <@${uid}> (\`${uid}\`) \u2014 ${cmds.map((c) => `\`${c}\``).join(', ')}`)
      : ['*none*'];

    const totalCmds = authEntries.reduce((n, [, cmds]) => n + cmds.length, 0);

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('Bot admins')
      .addFields(
        { name: `Owner (${ownerIds.size})`, value: ownerLines.join('\n').slice(0, 1024) || '*none*' },
        {
          name: `Authorized non-owners (${authEntries.length} user${authEntries.length === 1 ? '' : 's'} \u2022 ${totalCmds} grant${totalCmds === 1 ? '' : 's'})`,
          value: authLines.join('\n').slice(0, 1024),
        },
      )
      .setFooter({ text: 'Manage with ,authorize @user <command> or ,revoke @user [command]' });

    if (authEntries.length === 0 && ownerIds.size === 1) {
      embed.setDescription(`${warn} No non-owner authorizations yet. Use \`,authorize @user <command>\` to delegate one.`);
    }

    return message.channel.send({ embeds: [embed] });
  },
};

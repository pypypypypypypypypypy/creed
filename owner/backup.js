const { EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { color } = require('../config.json');
const { warn, deny, approve } = require('../emojis.json');
const { canRunOwnerCmd } = require('../utils/owners');
const backup = require('../utils/backup');

module.exports = {
  category: 'owner',
  help: [
    {
      name: 'backup',
      description: '[Owner] Manage Discord-channel-based config backups so welcome msgs, stats, etc. survive redeploys.',
      aliases: 'n/a',
      parameters: 'setup | now | restore | status',
      information: 'Owner-only (or authorized via ,authorize backup). Without this, your db file is wiped every time the host redeploys.',
      usage: 'backup <setup|now|restore|status>',
      example: 'backup status',
    },
  ],
  name: 'backup',
  aliases: [],

  run: async (client, message, args) => {
    if (!canRunOwnerCmd(message.author.id, 'backup')) return;

    const sub = (args[0] || 'status').toLowerCase();

    if (sub === 'status') {
      const s = backup.getStatus();
      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle('Backup status')
        .addFields(
          { name: 'Configured', value: s.configured ? 'yes' : 'no — run `,backup setup`', inline: true },
          { name: 'Channel', value: s.channelId ? `<#${s.channelId}>` : '—', inline: true },
          { name: 'Auto-save delay', value: `${Math.round(s.debounceMs / 1000)}s after last change`, inline: true },
          { name: 'Last backup', value: s.lastBackupAt ? `<t:${Math.floor(s.lastBackupAt / 1000)}:R>` : 'never', inline: true },
          { name: 'Last restore', value: s.lastRestoreAt ? `<t:${Math.floor(s.lastRestoreAt / 1000)}:R>` : 'never', inline: true },
          { name: 'Pending flush', value: s.pendingFlush ? 'yes' : 'no', inline: true },
          { name: 'Last error', value: s.lastError ? `\`${String(s.lastError).slice(0, 800)}\`` : 'none' },
        );
      return message.channel.send({ embeds: [embed] });
    }

    if (sub === 'now' || sub === 'save') {
      const r = await backup.uploadBackup();
      const desc = r.ok
        ? `${approve} ${message.author}: backup uploaded (**${r.size}** bytes).`
        : `${deny} ${message.author}: backup failed: \`${r.reason}\``;
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(desc)] });
    }

    if (sub === 'restore' || sub === 'load') {
      const r = await backup.restoreFromChannel();
      const desc = r.restored
        ? `${approve} ${message.author}: restored **${r.size}** bytes from snapshot <t:${Math.floor(new Date(r.ts).getTime() / 1000)}:R>. Restart the bot so any settings cached in memory at boot pick up the new data.`
        : `${deny} ${message.author}: restore failed: \`${r.reason}\``;
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(desc)] });
    }

    if (sub === 'setup') {
      if (!message.guild) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Run this inside the server you want backups for.`)] });
      }
      const me = message.guild.members.me;
      if (!me.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${deny} I need **Manage Channels** to create the backup channel.`)] });
      }

      let ch;
      try {
        ch = await message.guild.channels.create({
          name: 'bot-backup',
          type: ChannelType.GuildText,
          topic: 'Auto-managed by bored-xd. Do not delete \u2014 db_data.json snapshots are uploaded here.',
          permissionOverwrites: [
            { id: message.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            {
              id: me.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.ReadMessageHistory,
              ],
            },
            { id: message.author.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory] },
          ],
        });
      } catch (e) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${deny} Channel create failed: \`${e.message}\``)] });
      }

      const envSetCorrectly = process.env.BACKUP_CHANNEL_ID === ch.id;
      const lines = [
        `${approve} Created ${ch}.`,
        '',
        `**One-time setup** — add this on your host (Railway / Replit / Render / wherever):`,
        '```',
        `BACKUP_CHANNEL_ID=${ch.id}`,
        '```',
        `Then **restart the bot once** so the env var loads.`,
        '',
        `After that, every config change (welcome message, stats, autoroles, prefix, …) auto-saves to this channel within ~15 seconds, and on every startup the bot pulls the latest snapshot and writes it to disk before logging in. Your settings will survive any redeploy.`,
      ];
      if (envSetCorrectly) lines.push('', `Env var already matches \u2014 running an initial backup now.`);

      const sent = await message.channel.send({
        embeds: [new EmbedBuilder().setColor(color).setTitle('Backup channel created').setDescription(lines.join('\n'))],
      });

      if (envSetCorrectly) {
        const r = await backup.uploadBackup();
        const desc = r.ok
          ? `${approve} initial backup saved (**${r.size}** bytes).`
          : `${deny} initial backup failed: \`${r.reason}\``;
        sent.reply({ embeds: [new EmbedBuilder().setColor(color).setDescription(desc)] }).catch(() => {});
      }
      return sent;
    }

    return message.channel.send({
      embeds: [
        new EmbedBuilder().setColor(color).setDescription(
          `${warn} ${message.author}: usage \u2014 \`,backup setup\`, \`,backup now\`, \`,backup restore\`, \`,backup status\``
        ),
      ],
    });
  },
};

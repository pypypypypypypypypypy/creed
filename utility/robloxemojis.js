const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const NAMES = ['profile', 'avatar', 'groups', 'games', 'inventory', 'names', 'friends', 'followers', 'following', 'roblox'];

const SUCCESS = '<:success:1496708562695618641>';
const FAIL = '<:fail:1496708523613098035>';
const COLOR = 0x5dade2;

module.exports = {
  name: 'robloxemojis',
  aliases: ['rblxemojis', 'rbxemojis'],
  description: 'Upload the Roblox icon set as custom server emojis.',
  usage: 'robloxemojis',
  guildOnly: true,
  permissions: [PermissionFlagsBits.ManageGuildExpressions],

  async run(client, message, args) {
    if (!message.guild) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor(COLOR).setDescription(`${FAIL} This command can only be used in a server.`)],
      }).catch(() => {});
    }

    const member = message.member;
    if (!member.permissions.has(PermissionFlagsBits.ManageGuildExpressions) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor(COLOR).setDescription(`${FAIL} You need **Manage Expressions** to use this command.`)],
      }).catch(() => {});
    }
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor(COLOR).setDescription(`${FAIL} I need **Manage Expressions** to upload emojis.`)],
      }).catch(() => {});
    }

    const dir = path.join(__dirname, '..', 'assets', 'roblox-emojis');
    const created = [];
    const failed = [];

    const status = await message.channel.send({
      embeds: [new EmbedBuilder().setColor(COLOR).setDescription(`Uploading **${NAMES.length}** Roblox emojis…`)],
    }).catch(() => null);

    for (const name of NAMES) {
      const file = path.join(dir, `${name}.png`);
      if (!fs.existsSync(file)) {
        failed.push(`\`${name}\` (file missing)`);
        continue;
      }
      try {
        const existing = message.guild.emojis.cache.find((e) => e.name === name);
        if (existing) {
          await existing.delete('Replaced by ,robloxemojis').catch(() => {});
        }
        const emoji = await message.guild.emojis.create({
          attachment: fs.readFileSync(file),
          name,
          reason: `Uploaded via ,robloxemojis by ${message.author.tag}`,
        });
        created.push(`\`${name}\` ${emoji.toString()} → \`<:${emoji.name}:${emoji.id}>\``);
      } catch (err) {
        failed.push(`\`${name}\` (${err.message || 'failed'})`);
      }
    }

    const lines = [];
    if (created.length) lines.push(`${SUCCESS} **Created ${created.length}/${NAMES.length}**`, created.join('\n'));
    if (failed.length) lines.push('', `${FAIL} **Failed ${failed.length}**`, failed.join('\n'));

    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle('Roblox Emojis')
      .setDescription(lines.join('\n').slice(0, 4000));

    if (status) await status.edit({ embeds: [embed] }).catch(() => message.channel.send({ embeds: [embed] }).catch(() => {}));
    else await message.channel.send({ embeds: [embed] }).catch(() => {});
  },
};

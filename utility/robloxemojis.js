const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const NAMES = ['profile', 'avatar', 'groups', 'games', 'inventory', 'names', 'friends', 'followers', 'following', 'roblox'];

const SUCCESS = '<:success:1496708562695618641>';
const FAIL = '<:fail:1496708523613098035>';
const COLOR = 0x5dade2;

function sendEmbed(channel, desc) {
  return channel.send({ embeds: [new EmbedBuilder().setColor(COLOR).setDescription(desc)] }).catch(() => {});
}

module.exports = {
  name: 'robloxemojis',
  aliases: ['rblxemojis', 'rbxemojis'],
  description: 'Upload the Roblox icon set as custom server emojis.',
  usage: 'robloxemojis',

  async run(client, message, args) {
    try {
      if (!message.guild) return sendEmbed(message.channel, `${FAIL} This command can only be used in a server.`);

      const member = message.member;
      const isAdmin = member?.permissions?.has(PermissionFlagsBits.Administrator);
      const canManage = member?.permissions?.has(PermissionFlagsBits.ManageGuildExpressions);
      if (!isAdmin && !canManage) {
        return sendEmbed(message.channel, `${FAIL} You need **Manage Expressions** (or Administrator) to use this.`);
      }

      const me = message.guild.members.me || await message.guild.members.fetch(client.user.id).catch(() => null);
      if (!me) return sendEmbed(message.channel, `${FAIL} I couldn't fetch my own member object.`);
      if (!me.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
        return sendEmbed(message.channel, `${FAIL} I'm missing the **Manage Expressions** permission. Please grant it and try again.`);
      }

      const dir = path.join(__dirname, '..', 'assets', 'roblox-emojis');
      if (!fs.existsSync(dir)) {
        return sendEmbed(message.channel, `${FAIL} Asset folder missing on the bot host: \`${dir}\`. Redeploy the bot so it has the latest files.`);
      }

      const missing = NAMES.filter((n) => !fs.existsSync(path.join(dir, `${n}.png`)));
      if (missing.length) {
        return sendEmbed(message.channel, `${FAIL} Missing image files: ${missing.map((m) => `\`${m}.png\``).join(', ')}. Redeploy the bot.`);
      }

      const status = await message.channel.send({
        embeds: [new EmbedBuilder().setColor(COLOR).setDescription(`Uploading **${NAMES.length}** Roblox emojis…`)],
      }).catch(() => null);

      const created = [];
      const failed = [];

      for (const name of NAMES) {
        try {
          const existing = message.guild.emojis.cache.find((e) => e.name === name);
          if (existing) await existing.delete('Replaced by ,robloxemojis').catch(() => {});
          const buf = fs.readFileSync(path.join(dir, `${name}.png`));
          const emoji = await message.guild.emojis.create({
            attachment: buf,
            name,
            reason: `Uploaded via ,robloxemojis by ${message.author.tag}`,
          });
          created.push(`\`${name}\` ${emoji.toString()} \`<:${emoji.name}:${emoji.id}>\``);
        } catch (err) {
          failed.push(`\`${name}\` — ${err.message || err.code || 'unknown error'}`);
        }
      }

      const lines = [];
      if (created.length) lines.push(`${SUCCESS} **Created ${created.length}/${NAMES.length}**`, created.join('\n'));
      if (failed.length) lines.push('', `${FAIL} **Failed ${failed.length}**`, failed.join('\n'));
      if (!created.length && !failed.length) lines.push(`${FAIL} Nothing happened.`);

      const embed = new EmbedBuilder().setColor(COLOR).setTitle('Roblox Emojis').setDescription(lines.join('\n').slice(0, 4000));

      if (status) await status.edit({ embeds: [embed] }).catch(() => message.channel.send({ embeds: [embed] }).catch(() => {}));
      else await message.channel.send({ embeds: [embed] }).catch(() => {});
    } catch (err) {
      await sendEmbed(message.channel, `${FAIL} \`,robloxemojis\` crashed: \`${(err && err.message) || err || 'unknown'}\``);
    }
  },
};

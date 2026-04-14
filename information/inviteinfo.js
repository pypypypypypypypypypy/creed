const { EmbedBuilder } = require('discord.js');
const moment = require('moment');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');

module.exports = {
  category: 'information',
  help: [
    {
        name: 'inviteinfo',
        description: 'Get information about an invite',
        aliases: 'n/a',
        parameters: '(invite)',
        information: 'n/a',
        usage: 'inviteinfo (invite)',
        example: 'inviteinfo invite'
    }
],

    name: 'inviteinfo',
  aliases: ['ii', 'iinfo'],

  run: async (client, message, args) => {
    if (!args[0]) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color)
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle('Command: inviteinfo')
      .setDescription('View basic invite code information')
      .addFields(
        { name: '**Aliases**', value: 'N/A', inline: true },
        { name: '**Parameters**', value: 'code', inline: true },
        { name: '**Information**', value: 'N/A', inline: true },
        { name: '**Usage**', value: '```Syntax: inviteinfo (code)\nExample: inviteinfo abcd1234```' }
      )
      .setFooter({ text: 'Module: information' })
      .setTimestamp()
    ] });

    const invite = await client.fetchInvite(args[0]).catch(() => null);
    if (!invite) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Invalid **invite code** given`)] });

    const guild = invite.guild;

    const banner = guild?.bannerURL({ forceStatic: false, size: 2048 })
      ? `[**Banner Image**](${guild.bannerURL({ forceStatic: false, size: 2048 })})` : '';
    const splash = guild?.splashURL({ forceStatic: false, size: 2048 })
      ? `[**Splash Image**](${guild.splashURL({ forceStatic: false, size: 2048 })})` : '';
    const icon = guild?.iconURL({ forceStatic: false, size: 2048 })
      ? `[**Icon Image**](${guild.iconURL({ forceStatic: false, size: 2048 })})` : '';

    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle(`Invite: ${invite.code}`)
      .addFields(
        {
          name: '**Channel & Invite**',
          value: `**Channel:** ${invite.channel?.name || 'N/A'}\n**Channel ID:** \`${invite.channel?.id || 'N/A'}\`\n**Inviter:** ${invite.inviter?.tag || 'Unknown'}\n**Uses:** ${invite.uses ?? 'N/A'}\n**Max Uses:** ${invite.maxUses || 'Unlimited'}\n**Expires:** ${invite.expiresAt ? moment(invite.expiresAt).format('MMMM Do YYYY') : 'Never'}\n**Temporary:** ${invite.temporary ? 'Yes' : 'No'}`,
          inline: true
        },
        {
          name: '**Guild**',
          value: `**Name:** ${guild?.name || 'N/A'}\n**ID:** \`${guild?.id || 'N/A'}\`\n**Created:** ${guild?.createdAt ? moment(guild.createdAt).format('MMMM Do YYYY') : 'N/A'}\n**Members:** ${invite.memberCount ?? 'N/A'}\n**Online:** ${invite.presenceCount ?? 'N/A'}\n**Verification:** ${guild?.verificationLevel ?? 'N/A'}`,
          inline: true
        },
        { name: '**Assets**', value: [icon, banner, splash].filter(Boolean).join(' ') || 'None' }
      )
      .setThumbnail(guild?.iconURL() || null);

    message.channel.send({ embeds: [embed] });
  }
};

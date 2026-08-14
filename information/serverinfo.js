const { EmbedBuilder, ChannelType } = require('discord.js');
const moment = require('moment');
const ms = require('ms');
const { verifiedServer } = require('../emojis.json');
const { getCurrentColor, getImageAccentColor } = require('../utils/avatarColor');

module.exports = {
  name: 'serverinfo',
  aliases: ['si', 'server', 'guildinfo', 'guild'],
  category: 'information',
  help: [
    { name: 'serverinfo', description: 'View detailed information about the server', aliases: 'si, server, guildinfo, guild', parameters: 'n/a', information: 'n/a', usage: 'serverinfo', example: 'serverinfo' },
  ],

  run: async (client, message, args) => {
    const guild = message.guild;

    await guild.members.fetch().catch(() => {});

    const botCount = guild.members.cache.filter(m => m.user.bot).size;
    const humanCount = guild.memberCount - botCount;

    const create = `${moment(guild.createdAt).format('MMM Do YYYY')} (${ms(Date.now() - guild.createdAt, { long: true })} ago)`;

    const banner = guild.bannerURL({ forceStatic: false, size: 2048 });
    const splash = guild.splashURL({ forceStatic: false, size: 2048 });
    const icon = guild.iconURL({ forceStatic: false, size: 2048 });
    const iconForColor = guild.iconURL({ extension: 'png', forceStatic: true, size: 128 });
    const embedColor = await getImageAccentColor(iconForColor, getCurrentColor());

    const vanity = guild.vanityURLCode ? '(discord.gg/stain)' : '';

    const verificationLevels = {
      0: 'None',
      1: 'Low',
      2: 'Medium',
      3: 'High',
      4: 'Highest'
    };

    const owner = await guild.fetchOwner().catch(() => null);
    const ownerTag = owner ? owner.user.tag : 'Unknown';

    const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
    const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
    const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL({ forceStatic: false }) })
      .setTitle(`${guild.name} ${vanity} ${guild.verified ? verifiedServer : ''}`)
      .setDescription(`Server created on __${create}__`)
      .setThumbnail(icon)
      .setFooter({ text: `Guild ID: ${guild.id}` })
      .setTimestamp()
      .addFields(
        { name: '**Owner**', value: ownerTag, inline: true },
        { name: '**Members**', value: `**Total:** ${guild.memberCount}\n**Humans:** ${humanCount}\n**Bots:** ${botCount}`, inline: true },
        { name: '**Information**', value: `**Verification:** ${verificationLevels[guild.verificationLevel] || 'Unknown'}\n**Boost Tier:** ${guild.premiumTier}\n**Boosts:** ${guild.premiumSubscriptionCount || 0}`, inline: true },
        { name: '**Design**', value: `**Banner:** ${banner ? `[Click Here](${banner})` : 'N/A'}\n**Splash:** ${splash ? `[Click Here](${splash})` : 'N/A'}\n**Icon:** ${icon ? `[Click Here](${icon})` : 'N/A'}`, inline: true },
        { name: `**Channels (${guild.channels.cache.size})**`, value: `**Text:** ${textChannels}\n**Voice:** ${voiceChannels}\n**Category:** ${categories}`, inline: true },
        { name: '**Other**', value: `**Roles:** ${guild.roles.cache.size}\n**Emojis:** ${guild.emojis.cache.size}`, inline: true },
      );

    message.channel.send({ embeds: [embed] });
  }
};

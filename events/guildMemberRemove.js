const client = require('../index')
const db = require('../db')
const { default_prefix, color } = require("../config.json");
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js')
const Discord = { MessageEmbed: EmbedBuilder }

client.on("guildMemberRemove", async member => {

  // Log channel
  let logs = db.get(`logschannel_${member.guild.id}`);
  if (logs) {
    const embed = new EmbedBuilder()
      .setAuthor({ name: member.user.tag, iconURL: member.user.avatarURL() })
      .setDescription(`<@${member.id}> has left ${member.guild.name}`)
      .setColor(`${color}`)
      .setTimestamp();
    const cachedLogs = await client.channels.fetch(logs).catch(() => null);
    if (cachedLogs) cachedLogs.send({ embeds: [embed] }).catch(() => {});
  }

  // Goodbye message
  const goodbyeChannelId = db.get(`goodbye_channel_${member.guild.id}`);
  if (goodbyeChannelId) {
    const goodbyeChannel = await client.channels.fetch(goodbyeChannelId).catch(() => null);
    if (goodbyeChannel) {
      const rawMsg = db.get(`goodbye_message_${member.guild.id}`) || `Goodbye, **{user.tag}**! We hope to see you again.`;
      const msg = rawMsg
        .replace(/{user}/g, member.toString())
        .replace(/{user\.tag}/g, member.user.tag)
        .replace(/{guild}/g, member.guild.name)
        .replace(/{membercount}/g, member.guild.memberCount);
      goodbyeChannel.send(msg).catch(() => {});
    }
  }
})
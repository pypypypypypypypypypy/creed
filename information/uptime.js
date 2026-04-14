const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js')
const Discord = { MessageEmbed: EmbedBuilder };
const { color } = require("../config.json");

module.exports = {
  category: 'information',
  help: [
    {
        name: 'uptime',
        description: 'View how long the bot has been running',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'uptime',
        example: 'uptime'
    }
],

    name: "uptime",

  run: async (client, message, args) => {

    let days = Math.floor(client.uptime / 86400000);
    let hours = Math.floor(client.uptime / 3600000) % 24;
    let minutes = Math.floor(client.uptime / 60000) % 60;
    let seconds = Math.floor(client.uptime / 1000) % 60;

    let UptimeDays = days
    if (UptimeDays) {
      UptimeDays = `${days} days, `;
    } else {
      UptimeDays = ''
    }

    let UptimeHours = hours
    if (UptimeHours) {
      UptimeHours = `${hours} hours, `;
    } else {
      UptimeHours = ''
    }

    let UptimeMinutes = minutes
    if (UptimeMinutes) {
      UptimeMinutes = `${minutes} minutes, `;
    } else {
      UptimeMinutes = ''
    }

    let UptimeSeconds = seconds
    if (UptimeSeconds) {
      UptimeSeconds = `${seconds} seconds`;
    } else {
      UptimeSeconds = ''
    }

    const embed = new EmbedBuilder()
    .setColor(color)
    .setDescription(`:alarm_clock: **${client.user.username}** has been up for: ${UptimeDays}${UptimeHours}${UptimeMinutes}${UptimeSeconds}`)

    message.channel.send({ embeds: [embed] })
  }
}
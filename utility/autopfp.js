const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');

module.exports = {
  name: 'autopfp',
  aliases: ['autofp', 'pfpfeed'],
  category: 'utility',
  help: [
    { name: 'autopfp channel <#channel>', description: 'Set the channel for auto pfp posts', aliases: 'n/a', parameters: '<#channel>', information: 'MANAGE_GUILD', usage: 'autopfp channel <#channel>', example: 'autopfp channel #pfp' },
    { name: 'autopfp interval <minutes>', description: 'Set how often to post (5–1440 mins)', aliases: 'n/a', parameters: '<minutes>', information: 'MANAGE_GUILD', usage: 'autopfp interval <minutes>', example: 'autopfp interval 30' },
    { name: 'autopfp add <image url>', description: 'Add an image URL to the rotation', aliases: 'n/a', parameters: '<url>', information: 'MANAGE_GUILD', usage: 'autopfp add <url>', example: 'autopfp add https://i.imgur.com/example.png' },
    { name: 'autopfp remove <number>', description: 'Remove an image from the rotation by number', aliases: 'n/a', parameters: '<number>', information: 'MANAGE_GUILD', usage: 'autopfp remove <number>', example: 'autopfp remove 1' },
    { name: 'autopfp list', description: 'View all images in the rotation', aliases: 'n/a', parameters: 'n/a', information: 'n/a', usage: 'autopfp list', example: 'autopfp list' },
    { name: 'autopfp toggle', description: 'Enable or disable auto pfp posting', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'autopfp toggle', example: 'autopfp toggle' },
  ],

  run: async (client, message, args) => {
    const { warn, approve } = require('../emojis.json');
    const sub = args[0]?.toLowerCase();

    const manageOnly = ['channel', 'interval', 'add', 'remove', 'toggle'];
    if (manageOnly.includes(sub) && !message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: You need **Manage Server** permission.`)] });
    }

    if (sub === 'channel') {
      const ch = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
      if (!ch) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Mention a valid channel.`)] });
      db.set(`autopfp_channel_${message.guild.id}`, ch.id);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Auto PFP channel set to ${ch}.`)] });
    }

    if (sub === 'interval') {
      const mins = parseInt(args[1]);
      if (isNaN(mins) || mins < 5 || mins > 1440) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Interval must be between **5** and **1440** minutes.`)] });
      db.set(`autopfp_interval_${message.guild.id}`, mins);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Auto PFP interval set to **${mins}** minute(s).`)] });
    }

    if (sub === 'add') {
      const url = args[1];
      if (!url || !url.startsWith('http')) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Provide a valid image URL.`)] });
      const images = db.get(`autopfp_images_${message.guild.id}`) || [];
      if (images.length >= 50) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Maximum of 50 images reached.`)] });
      images.push(url);
      db.set(`autopfp_images_${message.guild.id}`, images);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Image added to rotation. (${images.length}/50)`)] });
    }

    if (sub === 'remove') {
      const idx = parseInt(args[1]) - 1;
      const images = db.get(`autopfp_images_${message.guild.id}`) || [];
      if (isNaN(idx) || idx < 0 || idx >= images.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Invalid image number.`)] });
      images.splice(idx, 1);
      db.set(`autopfp_images_${message.guild.id}`, images);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Image removed from rotation.`)] });
    }

    if (sub === 'toggle') {
      const cur = db.get(`autopfp_enabled_${message.guild.id}`) || false;
      db.set(`autopfp_enabled_${message.guild.id}`, !cur);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Auto PFP posting is now **${!cur ? 'enabled' : 'disabled'}**.`)] });
    }

    if (sub === 'list') {
      const images = db.get(`autopfp_images_${message.guild.id}`) || [];
      if (!images.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} No images in rotation. Add some with \`autopfp add <url>\`.`)] });
      const desc = images.map((url, i) => `\`${i + 1}\` [Image ${i + 1}](${url})`).join('\n');
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(`Auto PFP Rotation — ${message.guild.name}`).setDescription(desc).setFooter({ text: `${images.length}/50 images` })] });
    }

    const enabled = db.get(`autopfp_enabled_${message.guild.id}`) || false;
    const channelId = db.get(`autopfp_channel_${message.guild.id}`);
    const interval = db.get(`autopfp_interval_${message.guild.id}`) || 30;
    const images = db.get(`autopfp_images_${message.guild.id}`) || [];

    return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(`Auto PFP — ${message.guild.name}`)
      .addFields(
        { name: 'Status', value: enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
        { name: 'Channel', value: channelId ? `<#${channelId}>` : 'Not set', inline: true },
        { name: 'Interval', value: `${interval} minute(s)`, inline: true },
        { name: 'Images', value: `${images.length}/50`, inline: true }
      )
      .setFooter({ text: 'Use "autopfp channel", "autopfp add", "autopfp interval", "autopfp toggle"' })
    ] });
  }
};

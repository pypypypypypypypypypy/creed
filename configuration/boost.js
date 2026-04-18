const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { default_prefix } = require('../config.json');

module.exports = {
  name: 'boost',
  aliases: ['boostmsg', 'boostmessage'],
  category: 'configuration',
  help: [
    { name: 'boost', description: 'Manage boost message settings', aliases: 'boostmsg, boostmessage', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'boost', example: 'boost' },
    { name: 'boost channel', description: 'Set the boost message channel', aliases: 'n/a', parameters: '(channel)', information: 'MANAGE_GUILD', usage: 'boost channel #channel', example: 'boost channel #boosts' },
    { name: 'boost message', description: 'Set the boost message text', aliases: 'msg', parameters: '(message)', information: 'MANAGE_GUILD', usage: 'boost message (text)', example: 'boost message Thanks for boosting {user}!' },
    { name: 'boost clear', description: 'Clear the boost message settings', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'boost clear', example: 'boost clear' },
    { name: 'boost test', description: 'Test the boost message', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'boost test', example: 'boost test' },
  ],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });

    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;
    const sub = args[0]?.toLowerCase();

    if (!sub) {
      const channel = db.get(`boost_channel_${message.guild.id}`);
      const msg = db.get(`boost_message_${message.guild.id}`);
      const embed = new EmbedBuilder().setColor(color).setTitle('Boost Message Settings')
        .setDescription('Configure a message to send when someone boosts your server.')
        .addFields(
          { name: 'Channel', value: channel ? `<#${channel}>` : 'Not set', inline: true },
          { name: 'Message', value: msg ? msg.slice(0, 100) : 'Default', inline: true }
        )
        .addFields({ name: 'Subcommands', value: `\`${prefix}boost channel #channel\` — Set channel\n\`${prefix}boost message <text>\` — Set message\n\`${prefix}boost clear\` — Remove boost message\n\`${prefix}boost test\` — Preview boost message` })
        .setFooter({ text: `Variables: {user}, {user.tag}, {guild}, {membercount}, {boostcount}` });
      return message.channel.send({ embeds: [embed] });
    }

    if (sub === 'channel') {
      const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
      if (!channel) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please mention a valid channel.`)] });
      db.set(`boost_channel_${message.guild.id}`, channel.id);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Boost message channel set to ${channel}.`)] });
    }

    if (sub === 'message') {
      const text = args.slice(1).join(' ');
      if (!text) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please provide a message.\n**Variables:** \`{user}\`, \`{user.tag}\`, \`{guild}\`, \`{membercount}\`, \`{boostcount}\``)] });
      db.set(`boost_message_${message.guild.id}`, text);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Boost message set to: \`${text}\``)] });
    }

    if (sub === 'clear' || sub === 'remove') {
      db.delete(`boost_channel_${message.guild.id}`);
      db.delete(`boost_message_${message.guild.id}`);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Boost message configuration cleared.`)] });
    }

    if (sub === 'test') {
      const channelId = db.get(`boost_channel_${message.guild.id}`);
      const msgTemplate = db.get(`boost_message_${message.guild.id}`) || `🎉 Thank you **{user.tag}** for boosting **{guild}**! We now have **{boostcount}** boosts!`;
      const targetChannel = channelId ? message.guild.channels.cache.get(channelId) : message.channel;

      if (!targetChannel) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Boost channel not found.`)] });

      const formatted = msgTemplate
        .replace(/{user}/g, message.author.toString())
        .replace(/{user\.tag}/g, message.author.tag || message.author.username)
        .replace(/{guild}/g, message.guild.name)
        .replace(/{membercount}/g, message.guild.memberCount)
        .replace(/{boostcount}/g, message.guild.premiumSubscriptionCount);

      targetChannel.send({ content: formatted }).catch(() => {});
      if (targetChannel.id !== message.channel.id) {
        message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Test boost message sent to ${targetChannel}.`)] });
      }
      return;
    }

    return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Unknown subcommand. Use \`${prefix}boost\` for help.`)] });
  }
};

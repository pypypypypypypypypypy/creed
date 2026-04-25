const { EmbedBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const db = require('../db');
const fetch = require('node-fetch');
function getEmojis(){try{delete require.cache[require.resolve('../emojis.json')];return require('../emojis.json');}catch{return{};}}
function ok(message,text){const e=getEmojis();return message.channel.send({embeds:[new EmbedBuilder().setColor('#a3eb7b').setDescription(`${e.approve||'✅'} ${message.author}: ${text}`)]});}
function deny(message,text){const e=getEmojis();return message.channel.send({embeds:[new EmbedBuilder().setColor('#fe6464').setDescription(`${e.deny||'❌'} ${message.author}: ${text}`)]});}
function warn(message,text){const e=getEmojis();return message.channel.send({embeds:[new EmbedBuilder().setColor('#efa23a').setDescription(`${e.warn||'⚠️'} ${message.author}: ${text}`)]});}
function info(message,title,desc,fields){const em=new EmbedBuilder().setColor('#3498db').setTimestamp();if(title)em.setTitle(title);if(desc)em.setDescription(desc);if(fields&&fields.length)em.addFields(fields);return message.channel.send({embeds:[em]});}
function needPerm(message,flag,label){if(!flag)return true;if(message.member.permissions.has(PermissionFlagsBits[flag])||message.member.permissions.has(PermissionFlagsBits.Administrator))return true;warn(message,`You're missing permission: \`${label}\``);return false;}
function getChannel(message,args){return message.mentions.channels.first()||message.guild.channels.cache.get(args[0])||null;}
function getMember(message,args){return message.mentions.members.first()||message.guild.members.cache.get(args[0])||null;}

module.exports = {
  name: 'recentban',
  category: 'moderation',
  usage: 'recentban [count]',
  help: [{ name: 'recentban', description: 'Show the most recent bans on this server', aliases: 'recentbans', parameters: '[count]', information: 'BAN_MEMBERS', usage: 'recentban [count]', example: 'recentban 10' }],
  aliases: ['recentbans'],
  run: async (client, message, args) => {
    if (!needPerm(message, 'BanMembers', 'ban_members')) return;
    const count = Math.min(Math.max(parseInt(args[0]) || 5, 1), 25);
    try {
      const bans = await message.guild.bans.fetch({ limit: count });
      if (!bans.size) return info(message, 'Recent bans', 'No bans found.');
      const lines = [...bans.values()].map(b => `• ${b.user.tag} (\`${b.user.id}\`) — ${b.reason || 'No reason'}`);
      return info(message, `Recent bans (${bans.size})`, lines.join('\n').slice(0, 4000));
    } catch (e) {
      return deny(message, `Failed to fetch bans: ${e.message}`);
    }
  }
};

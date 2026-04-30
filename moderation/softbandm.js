const { EmbedBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const db = require('../db');
const fetch = require('node-fetch');
function getEmojis(){try{delete require.cache[require.resolve('../emojis.json')];return require('../emojis.json');}catch{return{};}}
function ok(message,text){const e=getEmojis();return message.channel.send({embeds:[new EmbedBuilder().setColor('#a3eb7b').setDescription(`${e.approve||'✅'} ${message.author}: ${text}`)]});}
function deny(message,text){const e=getEmojis();return message.channel.send({embeds:[new EmbedBuilder().setColor('#fe6464').setDescription(`${e.deny||'❌'} ${message.author}: ${text}`)]});}
function warn(message,text){const e=getEmojis();return message.channel.send({embeds:[new EmbedBuilder().setColor('#efa23a').setDescription(`${e.warn||'⚠️'} ${message.author}: ${text}`)]});}
function info(message,title,desc,fields){const em=new EmbedBuilder().setColor('#FFFFFF').setTimestamp();if(title)em.setTitle(title);if(desc)em.setDescription(desc);if(fields&&fields.length)em.addFields(fields);return message.channel.send({embeds:[em]});}
function needPerm(message,flag,label){if(!flag)return true;if(message.member.permissions.has(PermissionFlagsBits[flag])||message.member.permissions.has(PermissionFlagsBits.Administrator))return true;warn(message,`You're missing permission: \`${label}\``);return false;}
function getChannel(message,args){return message.mentions.channels.first()||message.guild.channels.cache.get(args[0])||null;}
function getMember(message,args){return message.mentions.members.first()||message.guild.members.cache.get(args[0])||null;}

module.exports = {
  name: 'softbandm',
  category: 'moderation',
  usage: 'softbandm <enable|disable|view>',
  help: [{ name: 'softbandm', description: 'Toggle whether the bot DMs a member when they are softban-ed', aliases: 'n/a', parameters: '<enable|disable|view>', information: 'MANAGE_GUILD', usage: 'softbandm <enable|disable|view>', example: 'softbandm enable' }],
  run: async (client, message, args) => {
    if (!needPerm(message, 'ManageGuild', 'manage_guild')) return;
    const sub = (args[0] || 'view').toLowerCase();
    const key = `softbandm_${message.guild.id}`;
    if (sub === 'enable' || sub === 'on') { db.set(key, true); return ok(message, 'DM on \`softban\` is now **enabled**.'); }
    if (sub === 'disable' || sub === 'off') { db.set(key, false); return ok(message, 'DM on \`softban\` is now **disabled**.'); }
    if (sub === 'view' || sub === 'status') {
      const v = db.get(key);
      return info(message, 'softbandm', `DM on \`softban\`: **${v ? 'enabled' : 'disabled'}**`);
    }
    return warn(message, 'Use `softbandm enable`, `softbandm disable`, or `softbandm view`.');
  }
};

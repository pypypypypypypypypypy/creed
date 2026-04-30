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
  name: 'purgesnipe', category: 'utility', usage: 'purgesnipe [n]',
  help: [{ name: 'purgesnipe', description: 'Show the last N purged messages in this channel', aliases: 'ps', parameters: '[n]', information: 'n/a', usage: 'purgesnipe [n]', example: 'purgesnipe 5' }],
  aliases: ['ps'],
  run: async (client, message, args) => {
    const n = Math.min(Math.max(parseInt(args[0]) || 1, 1), 10);
    const list = (db.get(`purgesnipe_${message.channel.id}`) || []).slice(-n).reverse();
    if (!list.length) return warn(message, 'Nothing to snipe.');
    const lines = list.map((m, i) => `**${i+1}.** ${m.author}: ${m.content?.slice(0, 200) || '(no content)'}`);
    return info(message, `Purged messages (${list.length})`, lines.join('\n'));
  }
};

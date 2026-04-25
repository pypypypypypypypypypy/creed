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
  name: 'guildnames', category: 'utility', usage: 'guildnames',
  help: [{ name: 'guildnames', description: 'Show past names tracked for this server', aliases: 'servernames', parameters: 'n/a', information: 'n/a', usage: 'guildnames', example: 'guildnames' }],
  aliases: ['servernames'],
  run: async (client, message, args) => {
    const key = `guildnames_${message.guild.id}`;
    const list = db.get(key) || [];
    if (!list.includes(message.guild.name)) { list.push(message.guild.name); db.set(key, list.slice(-25)); }
    const all = db.get(key) || [];
    return info(message, `Past names — ${message.guild.name}`, all.map((n, i) => `**${i+1}.** ${n}`).join('\n').slice(0, 4000));
  }
};

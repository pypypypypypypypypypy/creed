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
  name: 'emojis', category: 'information', usage: 'emojis',
  help: [{ name: 'emojis', description: 'List all custom emojis in this server', aliases: 'n/a', parameters: 'n/a', information: 'n/a', usage: 'emojis', example: 'emojis' }],
  run: async (client, message, args) => {
    const ems = message.guild.emojis.cache;
    if (!ems.size) return info(message, 'Emojis', 'No custom emojis.');
    const lines = [...ems.values()].map(e => `${e} \`:${e.name}:\``);
    const chunks = [];
    let buf = '';
    for (const ln of lines) { if ((buf + ' ' + ln).length > 3900) { chunks.push(buf); buf = ln; } else { buf = buf ? buf+' '+ln : ln; } }
    if (buf) chunks.push(buf);
    for (let i = 0; i < Math.min(chunks.length, 3); i++) {
      await message.channel.send({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setTitle(`Emojis (${ems.size}) — page ${i+1}/${Math.min(chunks.length,3)}`).setDescription(chunks[i])] });
    }
  }
};

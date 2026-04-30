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
  name: 'avatarhistory', category: 'utility', usage: 'avatarhistory [member]',
  help: [{ name: 'avatarhistory', description: 'Show stored past avatars for a user', aliases: 'avh', parameters: '[member]', information: 'n/a', usage: 'avatarhistory [member]', example: 'avatarhistory @user' }],
  aliases: ['avh'],
  run: async (client, message, args) => {
    const target = getMember(message, args)?.user || message.author;
    const list = db.get(`avatarhistory_${target.id}`) || [];
    const current = target.displayAvatarURL({ size: 1024, extension: 'png' });
    if (!list.includes(current)) { list.push(current); db.set(`avatarhistory_${target.id}`, list.slice(-25)); }
    const recent = (db.get(`avatarhistory_${target.id}`) || []).slice(-10).reverse();
    const e = new EmbedBuilder().setColor('#FFFFFF').setTitle(`Avatar history for ${target.tag}`).setDescription(recent.map((u, i) => `[#${i+1}](${u})`).join(' • ')).setImage(recent[0]);
    return message.channel.send({ embeds: [e] });
  }
};

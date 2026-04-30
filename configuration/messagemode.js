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

const MODES = ['embed','plain','compact'];
module.exports = {
  name: 'messagemode',
  category: 'configuration',
  usage: 'messagemode <embed|plain|compact|view>',
  help: [{ name: 'messagemode', description: 'Set how the bot formats outgoing messages (embed, plain, compact)', aliases: 'n/a', parameters: '<embed|plain|compact|view>', information: 'MANAGE_GUILD', usage: 'messagemode <mode>', example: 'messagemode embed' }],
  run: async (client, message, args) => {
    if (!needPerm(message, 'ManageGuild', 'manage_guild')) return;
    const sub = (args[0] || 'view').toLowerCase();
    const key = `messagemode_${message.guild.id}`;
    if (MODES.includes(sub)) { db.set(key, sub); return ok(message, `Message mode set to **${sub}**.`); }
    if (sub === 'view') { return info(message, 'messagemode', `Current mode: **${db.get(key) || 'embed'}**`); }
    if (sub === 'reset') { db.delete(key); return ok(message, 'Message mode reset to **embed**.'); }
    return warn(message, `Modes: ${MODES.map(m => `\`${m}\``).join(', ')}`);
  }
};

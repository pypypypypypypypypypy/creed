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

function rot13(s){return s.replace(/[a-zA-Z]/g, c => String.fromCharCode((c<='Z'?90:122) >= (c.charCodeAt(0)+13) ? c.charCodeAt(0)+13 : c.charCodeAt(0)-13));}

module.exports = {
  name: 'reveal', category: 'moderation', usage: 'reveal (reply to a message)',
  help: [{ name: 'reveal', description: 'Reveal the contents of a hidden/spoiler/encoded message (reply to it)', aliases: 'n/a', parameters: 'n/a', information: 'n/a', usage: 'reveal', example: 'reveal' }],
  run: async (client, message, args) => {
    const ref = message.reference?.messageId ? await message.channel.messages.fetch(message.reference.messageId).catch(() => null) : null;
    if (!ref) return warn(message, 'Reply to a message you want to reveal.');
    const raw = ref.content || '';
    const stripped = raw.replace(/\|\|/g, '');
    const decoded = rot13(stripped);
    return info(message, 'Reveal', `**Raw:** ${raw.slice(0, 1500) || '(empty)'}\n**Without spoilers:** ${stripped.slice(0, 1500) || '(empty)'}\n**ROT13 decoded:** ${decoded.slice(0, 1500) || '(empty)'}`);
  }
};

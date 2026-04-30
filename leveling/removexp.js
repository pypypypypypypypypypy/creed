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
  name: 'removexp', category: 'leveling', usage: 'removexp <member> <amount>',
  help: [{ name: 'removexp', description: 'Remove XP from a member', aliases: 'n/a', parameters: '<member> <amount>', information: 'MANAGE_GUILD', usage: 'removexp <member> <amount>', example: 'removexp @user 100' }],
  run: async (client, message, args) => {
    if (!needPerm(message, 'ManageGuild', 'manage_guild')) return;
    const target = getMember(message, args);
    if (!target) return warn(message, 'Mention a member.');
    const amt = parseInt(args[1]);
    if (!amt || amt < 1) return warn(message, 'Provide a positive amount.');
    const key = `xp_${message.guild.id}_${target.id}`;
    const cur = db.get(key) || 0;
    const next = Math.max(0, cur - amt);
    db.set(key, next);
    return ok(message, `Removed **${amt}** XP from ${target}. New total: **${next}**.`);
  }
};

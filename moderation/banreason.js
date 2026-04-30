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
  name: 'banreason', category: 'moderation', usage: 'banreason <user id|mention>',
  help: [{ name: 'banreason', description: 'Show the reason a user was banned', aliases: 'n/a', parameters: '<user id|mention>', information: 'BAN_MEMBERS', usage: 'banreason <user id|mention>', example: 'banreason 123456789012345678' }],
  run: async (client, message, args) => {
    if (!needPerm(message, 'BanMembers', 'ban_members')) return;
    const id = (message.mentions.users.first()?.id) || args[0];
    if (!id) return warn(message, 'Provide a user ID or mention.');
    try {
      const ban = await message.guild.bans.fetch(id);
      return info(message, `Ban: ${ban.user.tag}`, `**ID:** \`${ban.user.id}\`\n**Reason:** ${ban.reason || 'No reason provided'}`);
    } catch (e) { return warn(message, `No ban found for that user.`); }
  }
};

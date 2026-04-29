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
  name: 'drag', category: 'moderation', usage: 'drag <member> [channel]',
  help: [{ name: 'drag', description: 'Drag a member into your voice channel (or a specified channel)', aliases: 'n/a', parameters: '<member> [channel]', information: 'MOVE_MEMBERS', usage: 'drag <member> [channel]', example: 'drag @user' }],
  run: async (client, message, args) => {
    if (!needPerm(message, 'MoveMembers', 'move_members')) return;
    const target = getMember(message, args);
    if (!target) return warn(message, 'Mention a member.');
    if (!target.voice?.channel) return warn(message, 'That member is not in a voice channel.');
    const dest = getChannel(message, args.slice(1)) || message.member.voice?.channel;
    if (!dest) return warn(message, 'Join a voice channel or specify one.');
    if (dest.type !== ChannelType.GuildVoice && dest.type !== ChannelType.GuildStageVoice) return warn(message, 'Destination must be a voice channel.');
    await target.voice.setChannel(dest);
    return ok(message, `Dragged ${target} to ${dest}.`);
  }
};

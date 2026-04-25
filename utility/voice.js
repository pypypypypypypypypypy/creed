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
  name: 'voice',
  category: 'utility',
  usage: 'voice [member|channel]',
  help: [{ name: 'voice', description: 'Show voice channel info for a member or channel', aliases: 'n/a', parameters: '[member|channel]', information: 'n/a', usage: 'voice [member|channel]', example: 'voice @user' }],
  run: async (client, message, args) => {
    let target = getChannel(message, args);
    if (!target) {
      const m = getMember(message, args) || message.member;
      target = m.voice && m.voice.channel ? m.voice.channel : null;
      if (!target) return warn(message, 'That member is not in a voice channel.');
    }
    if (target.type !== ChannelType.GuildVoice && target.type !== ChannelType.GuildStageVoice) return warn(message, 'That is not a voice channel.');
    const members = [...target.members.values()].map(m => m.user.tag).join(', ') || 'None';
    return info(message, target.name, null, [
      { name: 'Bitrate', value: `${target.bitrate/1000} kbps`, inline: true },
      { name: 'User Limit', value: String(target.userLimit || '∞'), inline: true },
      { name: 'Region', value: target.rtcRegion || 'Auto', inline: true },
      { name: `Connected (${target.members.size})`, value: members.slice(0, 1024) }
    ]);
  }
};

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
  name: 'streamable',
  category: 'utility',
  usage: 'streamable <url|id>',
  help: [{ name: 'streamable', description: 'Show info about a Streamable video by URL or ID', aliases: 'n/a', parameters: '<url|id>', information: 'n/a', usage: 'streamable <url|id>', example: 'streamable abc123' }],
  run: async (client, message, args) => {
    if (!args[0]) return warn(message, 'Provide a Streamable URL or ID.');
    const id = (args[0].match(/streamable\.com\/([a-z0-9]+)/) || [,args[0]])[1];
    try {
      const res = await fetch(`https://api.streamable.com/videos/${id}`);
      if (!res.ok) return deny(message, `Video not found (${res.status}).`);
      const v = await res.json();
      const e = new EmbedBuilder().setColor('#0F90FA').setTitle(v.title || 'Streamable video').setURL(`https://streamable.com/${id}`).setTimestamp();
      if (v.thumbnail_url) e.setImage(`https:${v.thumbnail_url}`);
      if (v.files?.mp4) e.addFields({ name: 'Duration', value: `${Math.round(v.files.mp4.duration || 0)}s`, inline: true }, { name: 'Size', value: `${Math.round((v.files.mp4.size || 0)/1024/1024)} MB`, inline: true });
      return message.channel.send({ embeds: [e] });
    } catch (err) { return deny(message, `Failed: ${err.message}`); }
  }
};

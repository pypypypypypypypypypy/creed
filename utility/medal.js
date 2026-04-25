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
  name: 'medal',
  category: 'utility',
  usage: 'medal <url>',
  help: [{ name: 'medal', description: 'Show a Medal.tv clip by URL', aliases: 'n/a', parameters: '<url>', information: 'n/a', usage: 'medal <url>', example: 'medal https://medal.tv/clip/abc' }],
  run: async (client, message, args) => {
    const url = args[0];
    if (!url || !/medal\.tv/i.test(url)) return warn(message, 'Provide a valid Medal.tv URL.');
    try {
      const res = await fetch(`https://medal.tv/api/oembed?url=${encodeURIComponent(url)}`);
      if (!res.ok) return deny(message, `Medal returned ${res.status}.`);
      const o = await res.json();
      const e = new EmbedBuilder().setColor('#1B2735').setTitle(o.title || 'Medal clip').setURL(url).setAuthor({ name: o.author_name || 'Medal.tv' }).setTimestamp();
      if (o.thumbnail_url) e.setImage(o.thumbnail_url);
      return message.channel.send({ embeds: [e] });
    } catch (err) { return deny(message, `Failed: ${err.message}`); }
  }
};

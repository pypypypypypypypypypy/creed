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
  name: 'twitch', category: 'utility', usage: 'twitch <username>',
  help: [{ name: 'twitch', description: 'Show info about a Twitch channel', aliases: 'n/a', parameters: '<username>', information: 'n/a', usage: 'twitch <username>', example: 'twitch shroud' }],
  run: async (client, message, args) => {
    const u = args[0];
    if (!u) return warn(message, 'Usage: `twitch <username>`');
    try {
      const res = await fetch(`https://www.twitch.tv/${u}`, { headers: { 'User-Agent':'Mozilla/5.0' } });
      if (!res.ok) return deny(message, `Twitch returned ${res.status}.`);
      const html = await res.text();
      const live = /isLiveBroadcast/.test(html);
      const title = (html.match(/<title>([^<]+)<\/title>/) || [,u])[1];
      const desc = (html.match(/<meta name="description" content="([^"]+)"/) || [,''])[1];
      const img = (html.match(/<meta property="og:image" content="([^"]+)"/) || [,''])[1];
      const e = new EmbedBuilder().setColor('#9146FF').setTitle(title).setURL(`https://twitch.tv/${u}`).setDescription(desc.slice(0,2000)).addFields({ name: 'Status', value: live ? '🔴 Live' : '⚫ Offline', inline: true });
      if (img) e.setImage(img);
      return message.channel.send({ embeds: [e] });
    } catch (err) { return deny(message, `Failed: ${err.message}`); }
  }
};

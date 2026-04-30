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
  name: 'itunes', category: 'lastfm', usage: 'itunes <song>',
  help: [{ name: 'itunes', description: 'Search iTunes for a song', aliases: 'n/a', parameters: '<song>', information: 'n/a', usage: 'itunes <song>', example: 'itunes never gonna give you up' }],
  run: async (client, message, args) => {
    const q = args.join(' ').trim();
    if (!q) return warn(message, 'Usage: `itunes <song>`');
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&limit=1&entity=song`);
      const json = await res.json();
      const t = json.results?.[0];
      if (!t) return warn(message, 'No results.');
      const e = new EmbedBuilder().setColor('#FFFFFF').setTitle(`${t.trackName} — ${t.artistName}`).setURL(t.trackViewUrl).setDescription(`Album: **${t.collectionName}**\nGenre: ${t.primaryGenreName}\nReleased: <t:${Math.floor(new Date(t.releaseDate).getTime()/1000)}:D>`).setThumbnail((t.artworkUrl100 || '').replace('100x100','512x512'));
      return message.channel.send({ embeds: [e] });
    } catch (err) { return deny(message, `Failed: ${err.message}`); }
  }
};

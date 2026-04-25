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

async function getToken() {
  const id = process.env.SPOTIFY_CLIENT_ID, sec = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !sec) return null;
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${Buffer.from(id+':'+sec).toString('base64')}` },
    body: 'grant_type=client_credentials'
  });
  if (!res.ok) return null;
  return (await res.json()).access_token;
}

module.exports = {
  name: 'spotifytrack', category: 'lastfm', usage: 'spotifytrack <song>',
  help: [{ name: 'spotifytrack', description: 'Search Spotify for a track', aliases: 'st', parameters: '<song>', information: 'n/a', usage: 'spotifytrack <song>', example: 'spotifytrack never gonna give you up' }],
  aliases: ['st'],
  run: async (client, message, args) => {
    const q = args.join(' ').trim();
    if (!q) return warn(message, 'Usage: `spotifytrack <song>`');
    const token = await getToken();
    if (!token) return warn(message, 'Set env vars `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` to enable Spotify lookups.');
    try {
      const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=1`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      const t = json.tracks?.items?.[0];
      if (!t) return warn(message, 'No results.');
      const e = new EmbedBuilder().setColor('#1DB954').setTitle(`${t.name} — ${t.artists.map(x=>x.name).join(', ')}`).setURL(t.external_urls.spotify).setDescription(`Album: **${t.album.name}**\nDuration: ${Math.floor(t.duration_ms/60000)}:${String(Math.floor((t.duration_ms%60000)/1000)).padStart(2,'0')}`).setThumbnail(t.album.images[0]?.url);
      return message.channel.send({ embeds: [e] });
    } catch (err) { return deny(message, `Failed: ${err.message}`); }
  }
};

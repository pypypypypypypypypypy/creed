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
  name: 'fortnite',
  category: 'fun',
  usage: 'fortnite <username> [platform]',
  help: [{ name: 'fortnite', description: 'Get Fortnite stats for a player (requires FORTNITE_API_KEY env var)', aliases: 'fn', parameters: '<username> [platform]', information: 'n/a', usage: 'fortnite <username> [platform]', example: 'fortnite Ninja epic' }],
  aliases: ['fn'],
  run: async (client, message, args) => {
    const key = process.env.FORTNITE_API_KEY;
    if (!key) return warn(message, 'Set the env var `FORTNITE_API_KEY` (free key at fortnite-api.com) to enable this command.');
    const name = args[0];
    const platform = (args[1] || 'epic').toLowerCase();
    if (!name) return warn(message, 'Usage: `fortnite <username> [platform]`');
    try {
      const res = await fetch(`https://fortnite-api.com/v2/stats/br/v2?name=${encodeURIComponent(name)}&accountType=${platform}`, { headers: { Authorization: key } });
      if (!res.ok) return deny(message, `Fortnite API returned ${res.status}.`);
      const json = await res.json();
      const s = json.data?.stats?.all?.overall;
      if (!s) return warn(message, 'No stats found.');
      return info(message, `Fortnite: ${json.data.account.name}`, null, [
        { name: 'Wins', value: String(s.wins||0), inline: true },
        { name: 'Kills', value: String(s.kills||0), inline: true },
        { name: 'K/D', value: String(s.kd||0), inline: true },
        { name: 'Matches', value: String(s.matches||0), inline: true },
        { name: 'Win %', value: `${s.winRate||0}%`, inline: true },
        { name: 'Top 10', value: String(s.top10||0), inline: true }
      ]);
    } catch (err) { return deny(message, `Failed: ${err.message}`); }
  }
};

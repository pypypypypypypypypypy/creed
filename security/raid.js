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
  name: 'raid',
  category: 'security',
  usage: 'raid <on|off|view|setage> [days]',
  help: [
    { name: 'raid on', description: 'Enable raid mode (auto-action new accounts joining)', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'raid on', example: 'raid on' },
    { name: 'raid off', description: 'Disable raid mode', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'raid off', example: 'raid off' },
    { name: 'raid view', description: 'Show raid mode status', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'raid view', example: 'raid view' },
    { name: 'raid setage', description: 'Set minimum account age in days for joins during raid mode', aliases: 'n/a', parameters: '<days>', information: 'MANAGE_GUILD', usage: 'raid setage <days>', example: 'raid setage 7' }
  ],
  run: async (client, message, args) => {
    if (!needPerm(message, 'ManageGuild', 'manage_guild')) return;
    const sub = (args.shift() || 'view').toLowerCase();
    const key = `raidmode_${message.guild.id}`;
    const ageKey = `raidmode_age_${message.guild.id}`;
    if (sub === 'on') { db.set(key, true); return ok(message, 'Raid mode is now **enabled**.'); }
    if (sub === 'off') { db.set(key, false); return ok(message, 'Raid mode is now **disabled**.'); }
    if (sub === 'setage') {
      const d = parseInt(args[0]);
      if (!d || d < 1 || d > 365) return warn(message, 'Provide days between 1 and 365.');
      db.set(ageKey, d);
      return ok(message, `Minimum account age during raid mode set to **${d} days**.`);
    }
    if (sub === 'view') {
      const enabled = db.get(key);
      const age = db.get(ageKey) || 7;
      return info(message, 'raid', `Status: **${enabled ? 'enabled' : 'disabled'}**\nMin account age: **${age} day(s)**`);
    }
    return warn(message, 'Use `raid on|off|view|setage <days>`.');
  }
};

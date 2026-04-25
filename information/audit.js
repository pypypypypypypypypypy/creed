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
  name: 'audit', category: 'information', usage: 'audit [count]',
  help: [{ name: 'audit', description: 'Show the most recent audit log entries', aliases: 'auditlog', parameters: '[count]', information: 'VIEW_AUDIT_LOG', usage: 'audit [count]', example: 'audit 10' }],
  aliases: ['auditlog'],
  run: async (client, message, args) => {
    if (!needPerm(message, 'ViewAuditLog', 'view_audit_log')) return;
    const limit = Math.min(Math.max(parseInt(args[0]) || 10, 1), 25);
    try {
      const logs = await message.guild.fetchAuditLogs({ limit });
      const lines = [...logs.entries.values()].map(e => {
        const exec = e.executor ? e.executor.tag : 'unknown';
        const tgt = e.target?.tag || e.target?.name || e.target?.id || '';
        const ts = `<t:${Math.floor(e.createdTimestamp/1000)}:R>`;
        return `• ${ts} \`${e.actionType}/${e.action}\` by **${exec}**${tgt ? ` → ${tgt}` : ''}${e.reason ? ` — ${e.reason}` : ''}`;
      });
      return info(message, `Audit log (${lines.length})`, lines.join('\n').slice(0, 4000) || 'Empty.');
    } catch (e) { return deny(message, `Failed: ${e.message}`); }
  }
};

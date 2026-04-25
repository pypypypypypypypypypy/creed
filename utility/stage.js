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
  name: 'stage',
  category: 'utility',
  usage: 'stage <start|end|topic> [args]',
  help: [
    { name: 'stage start', description: 'Start a stage with a topic', aliases: 'n/a', parameters: '<topic>', information: 'MANAGE_CHANNELS', usage: 'stage start <topic>', example: 'stage start Q&A' },
    { name: 'stage end', description: 'End the active stage in your channel', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_CHANNELS', usage: 'stage end', example: 'stage end' },
    { name: 'stage topic', description: 'Update the topic of the active stage', aliases: 'n/a', parameters: '<topic>', information: 'MANAGE_CHANNELS', usage: 'stage topic <topic>', example: 'stage topic New Topic' }
  ],
  run: async (client, message, args) => {
    if (!needPerm(message, 'ManageChannels', 'manage_channels')) return;
    const sub = (args.shift() || '').toLowerCase();
    const ch = message.member.voice?.channel;
    if (!ch || ch.type !== ChannelType.GuildStageVoice) return warn(message, 'You must be in a stage channel.');
    if (sub === 'start') {
      const topic = args.join(' ').trim();
      if (!topic) return warn(message, 'Provide a topic.');
      try { await ch.createStageInstance({ topic }); return ok(message, `Started stage with topic **${topic}**.`); }
      catch (e) { return deny(message, `Failed: ${e.message}`); }
    }
    if (sub === 'end') {
      try { await ch.deleteStageInstance(); return ok(message, 'Stage ended.'); }
      catch (e) { return deny(message, `Failed: ${e.message}`); }
    }
    if (sub === 'topic') {
      const topic = args.join(' ').trim();
      if (!topic) return warn(message, 'Provide a topic.');
      try { await ch.editStageInstance({ topic }); return ok(message, `Topic updated to **${topic}**.`); }
      catch (e) { return deny(message, `Failed: ${e.message}`); }
    }
    return info(message, 'stage', 'Usage: `stage start <topic>`, `stage end`, `stage topic <topic>`');
  }
};

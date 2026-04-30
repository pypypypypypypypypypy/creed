const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
function getEmojis(){try{delete require.cache[require.resolve('../emojis.json')];return require('../emojis.json');}catch{return{};}}
function ok(message,text){const e=getEmojis();return message.channel.send({embeds:[new EmbedBuilder().setColor('#a3eb7b').setDescription(`${e.approve||'✅'} ${message.author}: ${text}`)]});}
function deny(message,text){const e=getEmojis();return message.channel.send({embeds:[new EmbedBuilder().setColor('#fe6464').setDescription(`${e.deny||'❌'} ${message.author}: ${text}`)]});}
function warn(message,text){const e=getEmojis();return message.channel.send({embeds:[new EmbedBuilder().setColor('#efa23a').setDescription(`${e.warn||'⚠️'} ${message.author}: ${text}`)]});}
function info(message,title,desc,fields){const em=new EmbedBuilder().setColor('#FFFFFF').setTitle(title).setTimestamp();if(desc)em.setDescription(desc);if(fields&&fields.length)em.addFields(fields);return message.channel.send({embeds:[em]});}
function needPerm(message,flag,label){if(!flag)return true;if(message.member.permissions.has(PermissionFlagsBits[flag])||message.member.permissions.has(PermissionFlagsBits.Administrator))return true;warn(message,`You're missing permission: \`${label}\``);return false;}
function getChannel(message,args){return message.mentions.channels.first()||message.guild.channels.cache.get(args[0])||null;}
function getMember(message,args){return message.mentions.members.first()||message.guild.members.cache.get(args[0])||null;}

module.exports = {
  name: 'youtube',
  category: 'utility',
  usage: 'youtube',
  help: [
    { name: 'youtube', description: 'repost a youtube post or follow a channel s post feed', aliases: 'n/a', parameters: '<url>', information: 'n/a', usage: 'youtube <url>', example: ',youtube https://' },
    { name: 'youtube list', description: 'list youtube feed channels', aliases: 'n/a', parameters: '', information: 'n/a', usage: 'youtube list', example: 'youtube list' },
    { name: 'youtube clear', description: 'reset all youtube feeds that have been setup', aliases: 'n/a', parameters: '', information: 'n/a', usage: 'youtube clear', example: 'youtube clear' },
    { name: 'youtube remove', description: 'remove a user from a channel s youtube feed', aliases: 'n/a', parameters: '<username> <channel>', information: 'n/a', usage: 'youtube remove <username> <channel>', example: ',youtube remove kitten #gen' },
    { name: 'youtube add', description: 'add a youtube user to feed posts into a channel', aliases: 'n/a', parameters: '<user> <channel>', information: 'n/a', usage: 'youtube add <user> <channel>', example: ',youtube add elonmusk #youtube' }
  ],

  run: async (client, message, args) => {
  if ((args[0]||'').toLowerCase() === 'list') {
    const subArgs = args.slice(1);
      if (!needPerm(message, 'ManageChannels', 'manage_channels')) return;
      const cfg = db.get(`youtube_list_${message.guild.id}`);
      if (!cfg || (Array.isArray(cfg) && cfg.length === 0)) return info(message, `youtube list`, 'No configuration set.');
      return info(message, `youtube list`, Array.isArray(cfg) ? cfg.map(v => `<#${v}>`).join(', ') : String(cfg));
  }
  if ((args[0]||'').toLowerCase() === 'clear') {
    const subArgs = args.slice(1);
      if (!needPerm(message, 'ManageChannels', 'manage_channels')) return;
      db.delete(`youtube_${message.guild.id}`);
      return ok(message, `Reset \`youtube\` configuration.`);
  }
  if ((args[0]||'').toLowerCase() === 'remove') {
    const subArgs = args.slice(1);
      if (!needPerm(message, 'ManageChannels', 'manage_channels')) return;
      const ch = getChannel(message, subArgs);
      if (!ch) return warn(message, 'Provide a valid channel.');
      const list = db.get(`youtube_add_${message.guild.id}`) || [];
      const idx = list.indexOf(ch.id);
      if (idx === -1) return warn(message, `That channel is not configured for \`youtube remove\`.`);
      list.splice(idx, 1);
      db.set(`youtube_add_${message.guild.id}`, list);
      return ok(message, `Removed ${ch} from \`youtube remove\`.`);
  }
  if ((args[0]||'').toLowerCase() === 'add') {
    const subArgs = args.slice(1);
      if (!needPerm(message, 'ManageChannels', 'manage_channels')) return;
      const ch = getChannel(message, subArgs);
      if (!ch) return warn(message, 'Provide a valid channel.');
      const list = db.get(`youtube_add_${message.guild.id}`) || [];
      if (list.includes(ch.id)) return warn(message, `That channel is already configured for \`youtube add\`.`);
      list.push(ch.id);
      db.set(`youtube_add_${message.guild.id}`, list);
      return ok(message, `Added ${ch} for \`youtube add\`.`);
  }
    return info(message, `youtube`, `repost a youtube post or follow a channel s post feed (params: url)`);
  }
};

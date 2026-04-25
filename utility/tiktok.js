const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
function getEmojis(){try{delete require.cache[require.resolve('../emojis.json')];return require('../emojis.json');}catch{return{};}}
function ok(message,text){const e=getEmojis();return message.channel.send({embeds:[new EmbedBuilder().setColor('#a3eb7b').setDescription(`${e.approve||'✅'} ${message.author}: ${text}`)]});}
function deny(message,text){const e=getEmojis();return message.channel.send({embeds:[new EmbedBuilder().setColor('#fe6464').setDescription(`${e.deny||'❌'} ${message.author}: ${text}`)]});}
function warn(message,text){const e=getEmojis();return message.channel.send({embeds:[new EmbedBuilder().setColor('#efa23a').setDescription(`${e.warn||'⚠️'} ${message.author}: ${text}`)]});}
function info(message,title,desc,fields){const em=new EmbedBuilder().setColor('#3498db').setTitle(title).setTimestamp();if(desc)em.setDescription(desc);if(fields&&fields.length)em.addFields(fields);return message.channel.send({embeds:[em]});}
function needPerm(message,flag,label){if(!flag)return true;if(message.member.permissions.has(PermissionFlagsBits[flag])||message.member.permissions.has(PermissionFlagsBits.Administrator))return true;warn(message,`You're missing permission: \`${label}\``);return false;}
function getChannel(message,args){return message.mentions.channels.first()||message.guild.channels.cache.get(args[0])||null;}
function getMember(message,args){return message.mentions.members.first()||message.guild.members.cache.get(args[0])||null;}

module.exports = {
  name: 'tiktok',
  category: 'utility',
  usage: 'tiktok',
  help: [
    { name: 'tiktok', description: 'lookup a tiktok user or feed their posts into a channel', aliases: 'n/a', parameters: '<username>', information: 'n/a', usage: 'tiktok <username>', example: ',tiktok kitten' },
    { name: 'tiktok clear', description: 'reset all tiktok feeds that have been setup', aliases: 'n/a', parameters: '', information: 'n/a', usage: 'tiktok clear', example: 'tiktok clear' },
    { name: 'tiktok add', description: 'add a tiktok user to have their posts feeded into a channel', aliases: 'n/a', parameters: '<username> <channel>', information: 'n/a', usage: 'tiktok add <username> <channel>', example: ',tiktok add kitten #gen' },
    { name: 'tiktok remove', description: 'remove a user from a channel s tiktok feed', aliases: 'n/a', parameters: '<username> <channel>', information: 'n/a', usage: 'tiktok remove <username> <channel>', example: ',tiktok remove kitten #gen' },
    { name: 'tiktok list', description: 'list tiktok feed channels', aliases: 'n/a', parameters: '', information: 'n/a', usage: 'tiktok list', example: 'tiktok list' }
  ],

  run: async (client, message, args) => {
  if ((args[0]||'').toLowerCase() === 'clear') {
    const subArgs = args.slice(1);
      if (!needPerm(message, 'ManageChannels', 'manage_channels')) return;
      db.delete(`tiktok_${message.guild.id}`);
      return ok(message, `Reset \`tiktok\` configuration.`);
  }
  if ((args[0]||'').toLowerCase() === 'add') {
    const subArgs = args.slice(1);
      if (!needPerm(message, 'ManageChannels', 'manage_channels')) return;
      const ch = getChannel(message, subArgs);
      if (!ch) return warn(message, 'Provide a valid channel.');
      const list = db.get(`tiktok_add_${message.guild.id}`) || [];
      if (list.includes(ch.id)) return warn(message, `That channel is already configured for \`tiktok add\`.`);
      list.push(ch.id);
      db.set(`tiktok_add_${message.guild.id}`, list);
      return ok(message, `Added ${ch} for \`tiktok add\`.`);
  }
  if ((args[0]||'').toLowerCase() === 'remove') {
    const subArgs = args.slice(1);
      if (!needPerm(message, 'ManageChannels', 'manage_channels')) return;
      const ch = getChannel(message, subArgs);
      if (!ch) return warn(message, 'Provide a valid channel.');
      const list = db.get(`tiktok_add_${message.guild.id}`) || [];
      const idx = list.indexOf(ch.id);
      if (idx === -1) return warn(message, `That channel is not configured for \`tiktok remove\`.`);
      list.splice(idx, 1);
      db.set(`tiktok_add_${message.guild.id}`, list);
      return ok(message, `Removed ${ch} from \`tiktok remove\`.`);
  }
  if ((args[0]||'').toLowerCase() === 'list') {
    const subArgs = args.slice(1);
      if (!needPerm(message, 'ManageChannels', 'manage_channels')) return;
      const cfg = db.get(`tiktok_list_${message.guild.id}`);
      if (!cfg || (Array.isArray(cfg) && cfg.length === 0)) return info(message, `tiktok list`, 'No configuration set.');
      return info(message, `tiktok list`, Array.isArray(cfg) ? cfg.map(v => `<#${v}>`).join(', ') : String(cfg));
  }
    return info(message, `tiktok`, `lookup a tiktok user or feed their posts into a channel (params: username)`);
  }
};

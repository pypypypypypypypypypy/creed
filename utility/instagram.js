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
  name: 'instagram',
  category: 'utility',
  usage: 'instagram',
  help: [
    { name: 'instagram', description: 'lookup an instagram user or follow their timeline', aliases: 'n/a', parameters: '<username>', information: 'n/a', usage: 'instagram <username>', example: ',instagram therock' },
    { name: 'instagram remove', description: 'remove a user from a channel s instagram feed', aliases: 'n/a', parameters: '<username> <channel>', information: 'n/a', usage: 'instagram remove <username> <channel>', example: ',instagram remove terrorist #gen' },
    { name: 'instagram clear', description: 'reset all instagram feeds that have been setup', aliases: 'n/a', parameters: '', information: 'n/a', usage: 'instagram clear', example: 'instagram clear' },
    { name: 'instagram list', description: 'list instagram feed channels', aliases: 'n/a', parameters: '', information: 'n/a', usage: 'instagram list', example: 'instagram list' },
    { name: 'instagram add', description: 'add an instagram user to have their posts feeded into a channel', aliases: 'n/a', parameters: '<username> <channel>', information: 'n/a', usage: 'instagram add <username> <channel>', example: ',instagram add terrorist #gen' }
  ],

  run: async (client, message, args) => {
  if ((args[0]||'').toLowerCase() === 'remove') {
    const subArgs = args.slice(1);
      if (!needPerm(message, 'ManageChannels', 'manage_channels')) return;
      const ch = getChannel(message, subArgs);
      if (!ch) return warn(message, 'Provide a valid channel.');
      const list = db.get(`instagram_add_${message.guild.id}`) || [];
      const idx = list.indexOf(ch.id);
      if (idx === -1) return warn(message, `That channel is not configured for \`instagram remove\`.`);
      list.splice(idx, 1);
      db.set(`instagram_add_${message.guild.id}`, list);
      return ok(message, `Removed ${ch} from \`instagram remove\`.`);
  }
  if ((args[0]||'').toLowerCase() === 'clear') {
    const subArgs = args.slice(1);
      if (!needPerm(message, 'ManageChannels', 'manage_channels')) return;
      db.delete(`instagram_${message.guild.id}`);
      return ok(message, `Reset \`instagram\` configuration.`);
  }
  if ((args[0]||'').toLowerCase() === 'list') {
    const subArgs = args.slice(1);
      if (!needPerm(message, 'ManageChannels', 'manage_channels')) return;
      const cfg = db.get(`instagram_list_${message.guild.id}`);
      if (!cfg || (Array.isArray(cfg) && cfg.length === 0)) return info(message, `instagram list`, 'No configuration set.');
      return info(message, `instagram list`, Array.isArray(cfg) ? cfg.map(v => `<#${v}>`).join(', ') : String(cfg));
  }
  if ((args[0]||'').toLowerCase() === 'add') {
    const subArgs = args.slice(1);
      if (!needPerm(message, 'ManageChannels', 'manage_channels')) return;
      const ch = getChannel(message, subArgs);
      if (!ch) return warn(message, 'Provide a valid channel.');
      const list = db.get(`instagram_add_${message.guild.id}`) || [];
      if (list.includes(ch.id)) return warn(message, `That channel is already configured for \`instagram add\`.`);
      list.push(ch.id);
      db.set(`instagram_add_${message.guild.id}`, list);
      return ok(message, `Added ${ch} for \`instagram add\`.`);
  }
    return info(message, `instagram`, `lookup an instagram user or follow their timeline (params: username)`);
  }
};

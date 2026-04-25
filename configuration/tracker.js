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
  name: 'tracker',
  category: 'configuration',
  usage: 'tracker',
  help: [
    { name: 'tracker', description: 'track username or vanity availability', aliases: 'n/a', parameters: '', information: 'n/a', usage: 'tracker', example: 'tracker' },
    { name: 'tracker settings', description: 'show your tracker configuration', aliases: 'n/a', parameters: '', information: 'n/a', usage: 'tracker settings', example: 'tracker settings' },
    { name: 'tracker vanity', description: 'set the channel for tracking vanitys', aliases: 'n/a', parameters: '', information: 'n/a', usage: 'tracker vanity', example: ',tracker vanitys add #vanities' },
    { name: 'tracker vanity add', description: 'add a channel for vanity notifications', aliases: 'n/a', parameters: '<channel>', information: 'n/a', usage: 'tracker vanity add <channel>', example: ',tracker vanity add #vanities' },
    { name: 'tracker vanity remove', description: 'remove a channel for vanity notifications', aliases: 'n/a', parameters: '<channel>', information: 'n/a', usage: 'tracker vanity remove <channel>', example: ',tracker vanity remove #vanities' },
    { name: 'tracker username', description: 'set the channel for tracking usernames', aliases: 'n/a', parameters: '', information: 'n/a', usage: 'tracker username', example: ',tracker usernames add #names' },
    { name: 'tracker username add', description: 'add a channel for username notifications', aliases: 'n/a', parameters: '<channel>', information: 'n/a', usage: 'tracker username add <channel>', example: ',tracker username add #names' },
    { name: 'tracker username remove', description: 'remove a channel for username notifications', aliases: 'n/a', parameters: '<channel>', information: 'n/a', usage: 'tracker username remove <channel>', example: ',tracker username remove #names' }
  ],

  run: async (client, message, args) => {
  if ((args[0]||'').toLowerCase() === 'settings') {
    const subArgs = args.slice(1);
      if (!needPerm(message, 'ManageGuild', 'manage_guild')) return;
      const cfg = db.get(`tracker_settings_${message.guild.id}`);
      if (!cfg || (Array.isArray(cfg) && cfg.length === 0)) return info(message, `tracker settings`, 'No configuration set.');
      return info(message, `tracker settings`, Array.isArray(cfg) ? cfg.map(v => `<#${v}>`).join(', ') : String(cfg));
  }
  if ((args[0]||'').toLowerCase() === 'vanity') {
    const subArgs = args.slice(1);
    if (args[1]) {
      if ((args[1]||'').toLowerCase() === 'add') {
        const subArgs = args.slice(2);
        if (!needPerm(message, 'ManageGuild', 'manage_guild')) return;
        const ch = getChannel(message, subArgs);
        if (!ch) return warn(message, 'Provide a valid channel.');
        const list = db.get(`tracker_vanity_add_${message.guild.id}`) || [];
        if (list.includes(ch.id)) return warn(message, `That channel is already configured for \`tracker vanity add\`.`);
        list.push(ch.id);
        db.set(`tracker_vanity_add_${message.guild.id}`, list);
        return ok(message, `Added ${ch} for \`tracker vanity add\`.`);
      }
      if ((args[1]||'').toLowerCase() === 'remove') {
        const subArgs = args.slice(2);
        if (!needPerm(message, 'ManageGuild', 'manage_guild')) return;
        const ch = getChannel(message, subArgs);
        if (!ch) return warn(message, 'Provide a valid channel.');
        const list = db.get(`tracker_vanity_add_${message.guild.id}`) || [];
        const idx = list.indexOf(ch.id);
        if (idx === -1) return warn(message, `That channel is not configured for \`tracker vanity remove\`.`);
        list.splice(idx, 1);
        db.set(`tracker_vanity_add_${message.guild.id}`, list);
        return ok(message, `Removed ${ch} from \`tracker vanity remove\`.`);
      }
    }
      if (!needPerm(message, 'ManageGuild', 'manage_guild')) return;
      return info(message, `tracker vanity`, `set the channel for tracking vanitys`);
  }
  if ((args[0]||'').toLowerCase() === 'username') {
    const subArgs = args.slice(1);
    if (args[1]) {
      if ((args[1]||'').toLowerCase() === 'add') {
        const subArgs = args.slice(2);
        if (!needPerm(message, 'ManageGuild', 'manage_guild')) return;
        const ch = getChannel(message, subArgs);
        if (!ch) return warn(message, 'Provide a valid channel.');
        const list = db.get(`tracker_username_add_${message.guild.id}`) || [];
        if (list.includes(ch.id)) return warn(message, `That channel is already configured for \`tracker username add\`.`);
        list.push(ch.id);
        db.set(`tracker_username_add_${message.guild.id}`, list);
        return ok(message, `Added ${ch} for \`tracker username add\`.`);
      }
      if ((args[1]||'').toLowerCase() === 'remove') {
        const subArgs = args.slice(2);
        if (!needPerm(message, 'ManageGuild', 'manage_guild')) return;
        const ch = getChannel(message, subArgs);
        if (!ch) return warn(message, 'Provide a valid channel.');
        const list = db.get(`tracker_username_add_${message.guild.id}`) || [];
        const idx = list.indexOf(ch.id);
        if (idx === -1) return warn(message, `That channel is not configured for \`tracker username remove\`.`);
        list.splice(idx, 1);
        db.set(`tracker_username_add_${message.guild.id}`, list);
        return ok(message, `Removed ${ch} from \`tracker username remove\`.`);
      }
    }
      if (!needPerm(message, 'ManageGuild', 'manage_guild')) return;
      return info(message, `tracker username`, `set the channel for tracking usernames`);
  }
    return info(message, `tracker`, `track username or vanity availability`);
  }
};

const { EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const ms = require('ms');
const db = require('../db');
const { default_prefix, color } = require('../config.json');
const { warn } = require('../emojis.json');
const { paginate } = require('../utils/paginate');
const { logModAction } = require('../utils/modlog');

module.exports = {
  name: 'jail',
  category: 'moderation',
  help: [
    { name: 'jail', description: 'Jail a member for a specified duration', aliases: 'n/a', parameters: '(member) (duration) [reason]', information: 'MANAGE_MESSAGES', usage: 'jail (member) (duration) [reason]', example: 'jail @user 1h Breaking rules' },
  ],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_messages\``)] });
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.MuteMembers))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`mute_members\``)] });

    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;
    if (message.author.bot) return;

    if (!args[0]) return paginate(message, [
      { name: 'jail', description: 'Jails (times out) the mentioned user', aliases: 'n/a', parameters: '(member) (duration) [reason]', information: 'MANAGE_MESSAGES', usage: `${prefix}jail (member) <duration> <reason>`, example: `${prefix}jail @user 1h Being weird` }
    ], 'moderation');

    const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!member) return message.channel.send('You didn\'t mention a valid user.');

    const mutetime = args[1];
    const rson = args.slice(2).join(' ');
    if (!mutetime) return message.channel.send('Please provide a duration. Ex: 1s/1m/1h/1d/1w');
    if (!rson) return message.channel.send('You didn\'t provide a reason!');

    const log = await db.fetch(`logschannel_${message.guild.id}`);
    if (!log) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Modlogs channel was **not found** - set it using \`${prefix}modlogs channel (channel)\``)] });

    let jailRole = message.guild.roles.cache.find(r => r.name === 'jailed');
    if (!jailRole) {
      jailRole = await message.guild.roles.create({ name: 'jailed', color: '#818386', permissions: [] });
      for (const [, channel] of message.guild.channels.cache.filter(c => c.type === ChannelType.GuildText)) {
        await channel.permissionOverwrites.edit(jailRole, { ViewChannel: false, ReadMessageHistory: false }).catch(() => {});
      }
    }

    await member.roles.add(jailRole);
    db.set(`jailed_${message.guild.id + member.id}`, 'jailed');
    db.set(`jailtime_${member.id + message.guild.id}`, mutetime);

    const timeStr = mutetime
      .replace('d', ' Day').replace('s', ' Second')
      .replace('h', ' Hour').replace('m', ' Minute').replace('w', ' Week');

    message.channel.send(`${member} is now jailed for **${timeStr}**`);

    const jailedembed = new EmbedBuilder()
      .setTitle('Penal: Jail')
      .setThumbnail(member.user.displayAvatarURL({ forceStatic: false }))
      .setColor(color)
      .addFields(
        { name: 'Moderator', value: `${message.author}`, inline: true },
        { name: 'Reason', value: `\`${rson}\``, inline: true },
        { name: 'User', value: `<@${member.id}>`, inline: true },
        { name: 'Time', value: `\`${mutetime}\`` }
      );

    const logChannel = message.guild.channels.cache.get(log);
    if (logChannel) logChannel.send({ embeds: [jailedembed] }).catch(() => {});

    setTimeout(async () => {
      db.delete(`jailed_${message.guild.id + member.id}`);
      await member.roles.remove(jailRole).catch(() => {});
      message.channel.send(`<@${member.id}> has been unjailed.`);
    }, ms(mutetime));
    logModAction(message.guild, { action: 'Jail', user: member.user, moderator: message.author, reason: rson || 'No Reason Supplied' }).catch(() => {});
  }
};

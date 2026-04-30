const client = require('../index');
const db = require('../db');
const { color } = require("../config.json");
const { EmbedBuilder } = require('discord.js');
const { parseEmbed, buildWelcomeVars } = require('../utils/embedParser');

client.on("guildMemberAdd", async member => {
  const antiNew = db.get(`anti-new_${member.guild.id}`);
  if (antiNew) {
    if (member.user.createdTimestamp + 1210000000 > Date.now()) {
      member.kick().catch(() => {});
      return;
    }
  }

  const role = member.guild.roles.cache.find(r => r.id === db.get(`autorole_${member.guild.id}`));
  if (role) await member.roles.add(role).catch(() => {});

  const logs = db.get(`logschannel_${member.guild.id}`);
  const logChannel = logs ? client.channels.cache.get(logs) : null;

  if (logChannel && role) {
    const embedRole = new EmbedBuilder()
      .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL({ forceStatic: false }) })
      .setTitle(`Autorole`)
      .addFields(
        { name: 'Member', value: `${member}`, inline: true },
        { name: 'Role', value: `${role}`, inline: true }
      )
      .setColor(color)
      .setTimestamp();
    logChannel.send({ embeds: [embedRole] }).catch(() => {});
  }

  if (logChannel) {
    const embedJoin = new EmbedBuilder()
      .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL({ forceStatic: false }) })
      .setDescription(`${member} has joined ${member.guild.name}`)
      .setColor(color)
      .setTimestamp();
    logChannel.send({ embeds: [embedJoin] }).catch(() => {});
  }

  const chx = db.get(`welchannel_${member.guild.id}`);
  if (chx) {
    const welcome = db.get(`welmessage_${member.guild.id}`);
    if (welcome) {
      const welChannel = client.channels.cache.get(chx);
      if (welChannel) {
        const vars = buildWelcomeVars(member);
        const payload = parseEmbed(welcome, vars);
        if (payload && (payload.content || (payload.embeds && payload.embeds.length))) {
          welChannel.send(payload).catch(() => {});
        }
      }
    }
  }

  const joinpingConfig = db.get(`joinping_${member.guild.id}`);
  if (joinpingConfig && joinpingConfig.channel) {
    const jpChannel = client.channels.cache.get(joinpingConfig.channel);
    if (jpChannel) {
      const jpText = (joinpingConfig.message || '{user}')
        .replace(/{user}/g, member.toString())
        .replace(/{server}/g, member.guild.name)
        .replace(/{count}/g, member.guild.memberCount);
      jpChannel.send(jpText).catch(() => {});
    }
  }
});

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { default_prefix } = require('../config.json');

module.exports = {
  name: 'proof',
  aliases: ['evidence'],
  category: 'moderation',
  help: [
    { name: 'proof', description: 'Manage moderation proof/evidence', aliases: 'evidence', parameters: 'n/a', information: 'MANAGE_MESSAGES', usage: 'proof', example: 'proof' },
    { name: 'proof set', description: 'Set the proof channel', aliases: 'n/a', parameters: '(#channel)', information: 'MANAGE_GUILD', usage: 'proof set (#channel)', example: 'proof set #proof' },
    { name: 'proof add', description: 'Add proof for a case', aliases: 'n/a', parameters: '(case #) (image/link)', information: 'MANAGE_MESSAGES', usage: 'proof add (case) (link)', example: 'proof add 1 https://...' },
    { name: 'proof remove', description: 'Remove proof from a case', aliases: 'n/a', parameters: '(case #)', information: 'MANAGE_MESSAGES', usage: 'proof remove (case)', example: 'proof remove 1' },
    { name: 'proof view', description: 'View proof for a case', aliases: 'n/a', parameters: '(case #)', information: 'MANAGE_MESSAGES', usage: 'proof view (case)', example: 'proof view 1' },
    { name: 'proof list', description: 'List all cases with proof', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_MESSAGES', usage: 'proof list', example: 'proof list' },
  ],

  run: async (client, message, args) => {
    const prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;
    const sub = (args[0] || '').toLowerCase();
    const gid = message.guild.id;

    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages) && !message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_messages\``)] });

    const proofsKey = `proofs_${gid}`;
    const proofs = db.get(proofsKey) || {};

    if (sub === 'set') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });
      const ch = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
      if (!ch) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Please mention a channel.`)] });
      db.set(`proof_channel_${gid}`, ch.id);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Proof channel set to ${ch}.`)] });
    }

    if (sub === 'add') {
      const caseNum = args[1];
      const link = args[2] || (message.attachments.first()?.url);
      if (!caseNum || !link) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}proof add (case #) (image link)\``)] });
      if (!proofs[caseNum]) proofs[caseNum] = [];
      proofs[caseNum].push({ url: link, author: message.author.id, date: Date.now() });
      db.set(proofsKey, proofs);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Proof added to case **#${caseNum}**.`)] });
    }

    if (sub === 'remove') {
      const caseNum = args[1];
      if (!caseNum || !proofs[caseNum]) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: No proof found for that case.`)] });
      delete proofs[caseNum];
      db.set(proofsKey, proofs);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Proof removed for case **#${caseNum}**.`)] });
    }

    if (sub === 'view') {
      const caseNum = args[1];
      if (!caseNum || !proofs[caseNum] || !proofs[caseNum].length) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: No proof found for that case.`)] });
      const lines = proofs[caseNum].map((p, i) => `**${i + 1}.** [Link](${p.url}) — <@${p.author}> (<t:${Math.floor(p.date / 1000)}:R>)`);
      const embed = new EmbedBuilder().setColor(color).setTitle(`Proof for Case #${caseNum}`).setDescription(lines.join('\n'));
      if (proofs[caseNum][0]?.url) embed.setImage(proofs[caseNum][0].url);
      return message.channel.send({ embeds: [embed] });
    }

    if (sub === 'list') {
      const cases = Object.keys(proofs);
      if (!cases.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: No proof entries found.`)] });
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Cases with Proof').setDescription(cases.map(c => `Case **#${c}** — ${proofs[c].length} proof(s)`).join('\n'))] });
    }

    return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}proof <set|add|remove|view|list>\``)] });
  }
};

const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'snowflake',
        description: 'Decode a Discord snowflake ID',
        aliases: 'sfid',
        parameters: '(snowflake id)',
        information: 'n/a',
        usage: 'snowflake (snowflake id)',
        example: 'snowflake snowflake id'
    }
],

    name: 'snowflake',
  aliases: ['sfid'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    const id = args[0];
    if (!id || !/^\d+$/.test(id)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}snowflake <id>\``)] });
    }

    const timestamp = Number(BigInt(id) >> 22n) + 1420070400000;
    const createdAt = Math.floor(timestamp / 1000);
    const workerId = (Number(BigInt(id) & 0x3E0000n)) >> 17;
    const processId = (Number(BigInt(id) & 0x1F000n)) >> 12;
    const increment = Number(BigInt(id) & 0xFFFn);

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('Snowflake ID Info')
      .addFields(
        { name: 'ID', value: id, inline: false },
        { name: 'Created', value: `<t:${createdAt}:F> (<t:${createdAt}:R>)`, inline: false },
        { name: 'Worker ID', value: `${workerId}`, inline: true },
        { name: 'Process ID', value: `${processId}`, inline: true },
        { name: 'Increment', value: `${increment}`, inline: true }
      )
      .setFooter({ text: 'Module: utility' })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};

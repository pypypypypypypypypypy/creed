const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { default_prefix } = require("../config.json");
const { approve } = require('../emojis.json');
const { warn } = require('../emojis.json');

module.exports = {
  name: "prefix",
  category: 'configuration',
  help: [
    { name: 'prefix', description: 'Set a custom command prefix for the server', aliases: 'n/a', parameters: '(prefix)', information: 'MANAGE_GUILD', usage: 'prefix (new prefix)', example: 'prefix !' },
  ],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.channel.send({ embeds: [new EmbedBuilder().setColor("efa23a").setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });

    if (!args[0]) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor("#6495ED").setDescription(`${message.author}: Please provide the prefix that you want to set`)] });
    }

    if (args[1]) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor("#efa23a").setDescription(`${warn} ${message.author}: You cannot set the **prefix** to a **double argument**`)] });
    }

    if (args[0].length > 3) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor("#efa23a").setDescription(`${warn} ${message.author}: Your **prefix** cannot be longer than **3 characters**!`)] });
    }

    if (args.join("") === default_prefix) {
      db.delete(`prefix_${message.guild.id}`);
      return await message.channel.send({ embeds: [new EmbedBuilder().setColor("#a3eb7b").setDescription(`${approve} ${message.author}: The guild's prefix has been reset to \`${default_prefix}\``)] });
    }

    db.set(`prefix_${message.guild.id}`, args[0]);
    await message.channel.send({ embeds: [new EmbedBuilder().setColor("#a3eb7b").setDescription(`${approve} ${message.author}: Replaced your current guild's prefix to \`${args[0]}\``)] });
  }
};

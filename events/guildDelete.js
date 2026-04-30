const client = require('../bored');
const { EmbedBuilder } = require('discord.js');

client.on("guildDelete", async guild => {
  let ownerTag = guild.ownerId;
  try {
    const owner = await client.users.fetch(guild.ownerId);
    ownerTag = owner.tag;
  } catch {}

  const embed = new EmbedBuilder()
    .setDescription(`Left guild: **${guild.name}**, owned by ${ownerTag} (\`${guild.id}\`) | **${guild.memberCount}** members`)
    .setColor('#FFFFFF');

  const logChannel = client.channels.cache.get("868302839947100160");
  if (logChannel) logChannel.send({ embeds: [embed] });
});

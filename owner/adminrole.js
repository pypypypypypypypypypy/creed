const { EmbedBuilder } = require('discord.js');
const { canRunOwnerCmd } = require('../utils/owners');

function getEmojis() {
  delete require.cache[require.resolve('../emojis.json')];
  return require('../emojis.json');
}

function findRole(message, args) {
  const mentioned = message.mentions.roles.first();
  if (mentioned) return mentioned;
  const byId = message.guild.roles.cache.get(args[0]);
  if (byId) return byId;
  const query = args.join(' ').toLowerCase().trim();
  if (!query) return null;
  return (
    message.guild.roles.cache.find(r => r.name.toLowerCase() === query) ||
    message.guild.roles.cache.find(r => r.name.toLowerCase().startsWith(query)) ||
    message.guild.roles.cache.find(r => r.name.toLowerCase().includes(query))
  );
}

module.exports = {
  name: 'adminrole',
  aliases: ['ar'],
  category: 'owner',
  help: [{
    name: 'adminrole',
    description: 'Give or remove any role below the bot\'s highest role from yourself (owner only)',
    aliases: 'ar',
    parameters: '(role)',
    information: 'BOT_OWNER',
    usage: 'adminrole (role)',
    example: 'adminrole Admin',
  }],

  run: async (client, message, args) => {
    if (!canRunOwnerCmd(message.author.id, 'adminrole')) return;

    const e = getEmojis();

    if (!args.length) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(
          `${e.warn} ${message.author}: Provide a role name, mention, or ID.\n\`\`\`\nSyntax: adminrole <role>\nExample: adminrole Admin\n\`\`\``
        )],
      });
    }

    const role = findRole(message, args);
    if (!role) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(
          `${e.warn} ${message.author}: Role not found. Try the role name, @mention, or ID.`
        )],
      });
    }

    const botHighest = message.guild.members.me.roles.highest;
    if (role.position >= botHighest.position) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(
          `${e.deny} ${message.author}: I cannot manage **${role.name}** — it's at or above my highest role (**${botHighest.name}**).`
        )],
      });
    }

    const hasRole = message.member.roles.cache.has(role.id);
    if (hasRole) {
      await message.member.roles.remove(role, 'adminrole — owner command').catch(() => {});
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(
          `${e.remove} ${message.author}: Removed **${role.name}** from you.`
        )],
      });
    } else {
      await message.member.roles.add(role, 'adminrole — owner command').catch(() => {});
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(
          `${e.add} ${message.author}: Gave you **${role.name}**.`
        )],
      });
    }
  },
};

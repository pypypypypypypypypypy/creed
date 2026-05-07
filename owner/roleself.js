const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
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
  name: 'roleself',
  aliases: ['rs', 'giverole', 'selfrole'],
  category: 'owner',
  help: [{
    name: 'roleself',
    description: 'Give or remove any role from yourself (owner only)',
    aliases: 'rs, giverole, selfrole',
    parameters: '(role)',
    information: 'BOT_OWNER',
    usage: 'roleself (role)',
    example: 'roleself Admin',
  }],

  run: async (client, message, args) => {
    if (!canRunOwnerCmd(message.author.id, 'roleself')) return;

    const e = getEmojis();

    if (!args.length) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(
          `${e.warn} ${message.author}: Provide a role name, mention, or ID.\n\`\`\`\nSyntax: roleself <role>\nExample: roleself Admin\n\`\`\``
        )],
      });
    }

    const role = findRole(message, args);
    if (!role) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(
          `${e.warn} ${message.author}: Role not found. Try the role name, @mention, or ID.`
        )],
      });
    }

    // Bot must be able to manage this role
    if (role.position >= message.guild.members.me.roles.highest.position) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(
          `${e.deny} ${message.author}: I cannot manage **${role.name}** — it's higher than my highest role.`
        )],
      });
    }

    const haRole = message.member.roles.cache.has(role.id);
    if (haRole) {
      await message.member.roles.remove(role, 'roleself — owner command').catch(() => {});
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(
          `${e.remove} ${message.author}: Removed **${role.name}** from you.`
        )],
      });
    } else {
      await message.member.roles.add(role, 'roleself — owner command').catch(() => {});
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(
          `${e.add} ${message.author}: Gave you **${role.name}**.`
        )],
      });
    }
  },
};

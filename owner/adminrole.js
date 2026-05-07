const { EmbedBuilder } = require('discord.js');
const { canRunOwnerCmd } = require('../utils/owners');

function getEmojis() {
  delete require.cache[require.resolve('../emojis.json')];
  return require('../emojis.json');
}

function findMember(message, arg) {
  if (!arg) return null;
  const mentioned = message.mentions.members.first();
  if (mentioned) return mentioned;
  const clean = arg.replace(/[<@!>]/g, '');
  return message.guild.members.cache.get(clean) || null;
}

function findRole(guild, args) {
  if (!args.length) return null;
  // Try by ID first
  const byId = guild.roles.cache.get(args[0]);
  if (byId) return byId;
  // Try by full name
  const query = args.join(' ').toLowerCase().trim();
  return (
    guild.roles.cache.find(r => r.name.toLowerCase() === query) ||
    guild.roles.cache.find(r => r.name.toLowerCase().startsWith(query)) ||
    guild.roles.cache.find(r => r.name.toLowerCase().includes(query))
  );
}

module.exports = {
  name: 'adminrole',
  aliases: ['ar'],
  category: 'owner',
  help: [{
    name: 'adminrole',
    description: 'Give or remove any role below the bot\'s highest role from a user (owner only)',
    aliases: 'ar',
    parameters: '<user> <role name or id>',
    information: 'BOT_OWNER',
    usage: 'adminrole <user> <role name or id>',
    example: 'adminrole @user Admin',
  }],

  run: async (client, message, args) => {
    if (!canRunOwnerCmd(message.author.id, 'adminrole')) return;

    const e = getEmojis();

    if (args.length < 2) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(
          `${e.warn} ${message.author}: Provide a user and a role.\n\`\`\`\nSyntax: adminrole <user> <role name or id>\nExample: adminrole @user Admin\n\`\`\``
        )],
      });
    }

    const member = findMember(message, args[0]);
    if (!member) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(
          `${e.warn} ${message.author}: Couldn't find that user. Mention them or use their ID.`
        )],
      });
    }

    // Role args = everything after the user arg
    const roleArgs = args.slice(1);
    const role = findRole(message.guild, roleArgs);
    if (!role) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(
          `${e.warn} ${message.author}: Role \`${roleArgs.join(' ')}\` not found. Use the role name or ID.`
        )],
      });
    }

    const botHighest = message.guild.members.me.roles.highest;
    if (role.position >= botHighest.position) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(
          `${e.deny} ${message.author}: I can't manage **${role.name}** — it's at or above my highest role (**${botHighest.name}**).`
        )],
      });
    }

    const hasRole = member.roles.cache.has(role.id);
    if (hasRole) {
      await member.roles.remove(role, 'adminrole — owner command').catch(() => {});
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(
          `${e.remove} ${message.author}: Removed **${role.name}** from ${member}.`
        )],
      });
    } else {
      await member.roles.add(role, 'adminrole — owner command').catch(() => {});
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(
          `${e.add} ${message.author}: Gave **${role.name}** to ${member}.`
        )],
      });
    }
  },
};

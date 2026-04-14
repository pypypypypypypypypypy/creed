const glob = require('glob');
const { isOwner } = require('../utils/owners');

module.exports = {
  category: 'owner',
  help: [
    {
        name: 'reload',
        description: 'Reload a command',
        aliases: 'n/a',
        parameters: '(command)',
        information: 'BOT_OWNER',
        usage: 'reload (command)',
        example: 'reload command'
    }
],

    name: "reload",
  category: "owner",

  run: async (client, message, args) => {
    if (!isOwner(message.author.id)) return;
    client.commands.sweep(() => true);
    glob(`${__dirname}/../**/*.js`, async (err, filePaths) => {
      if (err) {
        console.log(err);
        return message.reply('❌ Reload failed — check console for details.');
      }
      filePaths.forEach((file) => {
        delete require.cache[require.resolve(file)];
        const pull = require(file);
        if (pull.name) {
          client.commands.set(pull.name, pull);
        }
        if (pull.aliases && Array.isArray(pull.aliases)) {
          pull.aliases.forEach(alias => client.aliases.set(alias, pull.name));
        }
      });
      message.reply('✅ All commands reloaded successfully.');
    });
  }
};

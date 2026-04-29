const { globSync } = require('glob');
const path = require('path');
const { canRunOwnerCmd } = require('../utils/owners');

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
      example: 'reload command',
    },
  ],

  name: 'reload',
  category: 'owner',

  run: async (client, message, args) => {
    if (!canRunOwnerCmd(message.author.id, 'reload')) return;

    let filePaths;
    try {
      filePaths = globSync(`${path.join(__dirname, '..')}/**/*.js`, { ignore: '**/node_modules/**' });
    } catch (err) {
      console.log(err);
      return message.reply('❌ Reload failed — check console for details.');
    }

    client.commands.sweep(() => true);
    if (client.aliases) client.aliases.sweep(() => true);

    let reloaded = 0;
    let failed = 0;
    for (const file of filePaths) {
      try {
        delete require.cache[require.resolve(file)];
        const pull = require(file);
        if (pull && pull.name) {
          client.commands.set(pull.name, pull);
          reloaded++;
          if (Array.isArray(pull.aliases) && client.aliases) {
            for (const alias of pull.aliases) client.aliases.set(alias, pull.name);
          }
        }
      } catch (e) {
        failed++;
        console.log(`reload failed for ${file}:`, e.message);
      }
    }

    return message.reply(`✅ Reloaded ${reloaded} commands${failed ? ` (${failed} failed)` : ''}.`);
  },
};

const { Client, Message } = require('discord.js');
const { canRunOwnerCmd } = require('../utils/owners');

module.exports = {
  category: 'owner',
  help: [
    {
        name: 'eval',
        description: 'Evaluate JavaScript code',
        aliases: 'n/a',
        parameters: '(code)',
        information: 'BOT_OWNER',
        usage: 'eval (code)',
        example: 'eval code'
    }
],

      name: "eval",
    aliases: ["pyk"],
    category: "owner",
    // cooldown:  ,

    /** *
    * @param { Client } client
    * @param { Message }message
    * @param { String[] } args
    */

    run: async (client, message, args) => {
        if (!canRunOwnerCmd(message.author.id, 'eval')) return;

        const clean = text => {
            if (typeof (text) === "string")
                return text.replace(/`/g, "`" + String.fromCharCode(8203)).replace(/@/g, "@" + String.fromCharCode(8203));
            else
                return text;
        }
        try {
            const code = args.join(" ");
            let evaled = eval(code);

            if (typeof evaled !== "string")
                evaled = require("util").inspect(evaled);

            message.channel.send(clean(evaled), { code: "xl" });
        } catch (err) {
            message.channel.send(`\`ERROR\` \`\`\`xl\n${clean(err)}\n\`\`\``);
        }
    }

}
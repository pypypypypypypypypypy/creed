const { canRunOwnerCmd } = require('../utils/owners');

module.exports = {
  category: 'owner',
  help: [
    {
        name: 'portal',
        description: 'Generate an invite to a guild',
        aliases: 'n/a',
        parameters: '(guild id)',
        information: 'BOT_OWNER',
        usage: 'portal (guild id)',
        example: 'portal guild id'
    }
],

      name: "portal",
    category: "owner",
    folder: "owner",
    props: {
        aliases: [
            "createportal",
            "transport",
            "portalcreate",
        ],
        args: {
            need: 1,
            prompt: "which guild should I create a portal to?",
            usage: {
                format: "{id}",
                examples: ["778883981982"]
            }
        }
    },
    about: "Creates a server portal.",

    async run(client, message, args) {
        if (!canRunOwnerCmd(message.author.id, 'portal')) return;

        const guild = client.guilds.cache
            .get(args[0]);

        if (guild) {
            guild.channels.cache
                .filter(channel => channel.type !== "category").first()
                .createInvite(
                    false,
                    84600,
                    0,
                    false
                ).then(invite => message.channel.send(`discord.gg/${invite.code}`));
        } else {
            return message.channel.send("that guild is invalid");
        };
    }
};
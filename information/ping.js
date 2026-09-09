module.exports = {
  category: 'information',
  help: [
    {
        name: 'ping',
        description: 'Check the bot latency and API response time',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'ping',
        example: 'ping'
    }
],

    name: "ping",
  aliases: ["latency"],

  run: async (client, message, args) => {
    let ping = [
      `it took \`${Math.round(client.ws.ping)}ms\` to ping **woke's step sister**`,
      `it took \`${Math.round(client.ws.ping)}ms\` to ping **the chinese government**`,
      `it took \`${Math.round(client.ws.ping)}ms\` to ping **lil uzi**`,
      `it took \`${Math.round(client.ws.ping)}ms\` to ping **your mother**`,
      `it took \`${Math.round(client.ws.ping)}ms\` to ping **lil mosey**`,
      `it took \`${Math.round(client.ws.ping)}ms\` to ping **north korea**`,
      `it took \`${Math.round(client.ws.ping)}ms\` to ping **localhost**`,
      `it took \`${Math.round(client.ws.ping)}ms\` to ping **twitter**`,
      `it took \`${Math.round(client.ws.ping)}ms\` to ping **the santos**`,
      `it took \`${Math.round(client.ws.ping)}ms\` to ping **the trash**`,
      `it took \`${Math.round(client.ws.ping)}ms\` to ping **woke's opsec**`,
      `it took \`${Math.round(client.ws.ping)}ms\` to ping **the circles**`,
      `it took \`${Math.round(client.ws.ping)}ms\` to ping **king von's bullet**`,
      `it took \`${Math.round(client.ws.ping)}ms\` to ping **fivem servers**`,
      `it took \`${Math.round(client.ws.ping)}ms\` to ping **new york**`,
      `it took \`${Math.round(client.ws.ping)}ms\` to ping **jordan 4s**`,
      `it took \`${Math.round(client.ws.ping)}ms\` to ping **netflix database**`
    ];
    const random = Math.floor(Math.random() * ping.length);
    if (args[0] === "me") {
      message.reply(ping[random]);
    } else {
      message.channel.send(args.join(" ") + ping[random]);
    }
  }
}
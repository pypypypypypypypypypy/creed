module.exports = {
  category: 'fun',
  help: [
    {
        name: 'randomnumber',
        description: 'Generate a random number in a range',
        aliases: 'rand, rng',
        parameters: '(min) (max)',
        information: 'n/a',
        usage: 'randomnumber (min) (max)',
        example: 'randomnumber min max'
    }
],

    name: "randomnumber",
  aliases: ["rn"],

  run: async (client, message, args) => {

    let result = Math.floor(Math.random() * 101);

    message.channel.send(`${result}`);
  }
};
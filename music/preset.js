const { EmbedBuilder } = require('discord.js');
const { warn, approve } = require('../emojis.json');

const PRESETS = {
  flat:    Array(15).fill(0),
  bass:    [0.6, 0.7, 0.8, 0.55, 0.25, 0, -0.25, -0.45, -0.55, -0.55, -0.55, -0.55, -0.55, -0.55, -0.55],
  treble:  [-0.4, -0.4, -0.4, -0.4, -0.4, -0.4, -0.1, 0.1, 0.4, 0.45, 0.55, 0.6, 0.6, 0.6, 0.6],
  vocal:   [-0.2, -0.2, -0.1, 0.1, 0.3, 0.4, 0.4, 0.3, 0.1, -0.1, -0.2, -0.2, -0.2, -0.2, -0.2],
  pop:     [-0.2, -0.1, 0.05, 0.15, 0.3, 0.35, 0.3, 0.15, 0.05, 0.05, 0.0, -0.05, -0.1, -0.15, -0.2],
  rock:    [0.3, 0.25, 0.2, 0.1, -0.05, -0.15, -0.2, -0.1, 0.05, 0.1, 0.15, 0.2, 0.25, 0.25, 0.25],
  jazz:    [0.2, 0.15, 0.1, 0.05, -0.05, -0.05, 0.0, 0.05, 0.1, 0.15, 0.2, 0.2, 0.15, 0.1, 0.1],
  earrape: Array(15).fill(0.95)
};

module.exports = {
  category: 'music',
  help: [
    { name: 'preset', description: 'Apply or list audio equalizer presets', aliases: 'eq', parameters: '[name]', information: 'n/a', usage: 'preset [name]', example: 'preset bass' },
    { name: 'preset list', description: 'List available presets', aliases: 'n/a', parameters: 'n/a', information: 'n/a', usage: 'preset list', example: 'preset list' },
    { name: 'preset reset', description: 'Reset to flat equalizer', aliases: 'n/a', parameters: 'n/a', information: 'n/a', usage: 'preset reset', example: 'preset reset' }
  ],
  name: 'preset',
  aliases: ['eq'],
  run: async (client, message, args) => {
    const sub = (args[0] || 'list').toLowerCase();
    const player = client.lavalink?.getPlayer(message.guild.id);
    if (sub === 'list') {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#3498db').setTitle('Equalizer presets').setDescription(Object.keys(PRESETS).map(p => `\`${p}\``).join(' • '))] });
    }
    if (!player) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Nothing is playing.`)] });
    const name = sub === 'reset' ? 'flat' : sub;
    if (!PRESETS[name]) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Unknown preset. Try \`preset list\`.`)] });
    const eq = PRESETS[name].map((gain, band) => ({ band, gain }));
    try {
      if (player.filterManager?.setEQ) await player.filterManager.setEQ(eq);
      else if (player.setEqualizer) await player.setEqualizer(eq);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Applied **${name}** preset.`)] });
    } catch (e) { return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`Failed: ${e.message}`)] }); }
  }
};

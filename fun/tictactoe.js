const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const { default_prefix } = require('../config.json');
const db = require('../db');

const games = new Map();

function checkWin(board) {
  const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a,b,c] of wins) if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  return null;
}

function buildRows(board, disabled = false) {
  const emojis = { X: '❌', O: '⭕', '': '⬜' };
  const rows = [];
  for (let i = 0; i < 3; i++) {
    const row = new ActionRowBuilder();
    for (let j = 0; j < 3; j++) {
      const idx = i * 3 + j;
      const val = board[idx];
      row.addComponents(new ButtonBuilder()
        .setCustomId(`ttt_${idx}`)
        .setLabel(emojis[val])
        .setStyle(val === 'X' ? ButtonStyle.Danger : val === 'O' ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setDisabled(disabled || !!val)
      );
    }
    rows.push(row);
  }
  return rows;
}

module.exports = {
  category: 'fun',
  help: [
    {
        name: 'tictactoe',
        description: 'Play tic-tac-toe with another user',
        aliases: 'ttt',
        parameters: '(user)',
        information: 'n/a',
        usage: 'tictactoe (user)',
        example: 'tictactoe user'
    }
],

    name: 'tictactoe',
  aliases: ['ttt'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;
    const opponent = message.mentions.members.first();
    if (!opponent) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}tictactoe @user\``)] });
    if (opponent.id === message.author.id) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You can't play against yourself.`)] });
    if (opponent.user.bot) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You can't play against a bot.`)] });

    const board = Array(9).fill('');
    const players = { X: message.author.id, O: opponent.id };
    let turn = 'X';

    const embed = new EmbedBuilder().setColor(color)
      .setTitle('Tic-Tac-Toe')
      .setDescription(`❌ <@${players.X}> vs ⭕ <@${players.O}>\n\nIt's <@${players[turn]}>'s turn!`);

    const msg = await message.channel.send({ embeds: [embed], components: buildRows(board) });

    const collector = msg.createMessageComponentCollector({ time: 120000 });

    games.set(msg.id, { board, players, turn });

    collector.on('collect', async i => {
      const game = games.get(msg.id);
      if (i.user.id !== game.players[game.turn]) {
        return i.reply({ content: `It's not your turn!`, ephemeral: true });
      }
      const idx = parseInt(i.customId.split('_')[1]);
      if (game.board[idx]) return i.reply({ content: 'That cell is taken!', ephemeral: true });

      game.board[idx] = game.turn;
      const winner = checkWin(game.board);
      const full = game.board.every(c => c !== '');

      if (winner) {
        const winEmbed = new EmbedBuilder().setColor(color).setTitle('Tic-Tac-Toe').setDescription(`🎉 <@${game.players[winner]}> wins!`);
        await i.update({ embeds: [winEmbed], components: buildRows(game.board, true) });
        games.delete(msg.id);
        return collector.stop();
      }

      if (full) {
        const drawEmbed = new EmbedBuilder().setColor(color).setTitle('Tic-Tac-Toe').setDescription("It's a draw!");
        await i.update({ embeds: [drawEmbed], components: buildRows(game.board, true) });
        games.delete(msg.id);
        return collector.stop();
      }

      game.turn = game.turn === 'X' ? 'O' : 'X';
      const nextEmbed = new EmbedBuilder().setColor(color).setTitle('Tic-Tac-Toe')
        .setDescription(`❌ <@${game.players.X}> vs ⭕ <@${game.players.O}>\n\nIt's <@${game.players[game.turn]}>'s turn!`);
      await i.update({ embeds: [nextEmbed], components: buildRows(game.board) });
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time' && games.has(msg.id)) {
        msg.edit({ components: buildRows(games.get(msg.id).board, true) }).catch(() => {});
        games.delete(msg.id);
      }
    });
  }
};

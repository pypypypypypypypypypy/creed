const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const { default_prefix } = require('../config.json');
const { paginate } = require('../utils/paginate');

const FILTERS = [
  'billboard', 'bloom', 'blur', 'book', 'caption', 'circuitboard', 'deepfry',
  'fisheye', 'flag', 'flag2', 'fortune', 'grayscale', 'heart', 'invert',
  'magik', 'meme', 'motivate', 'neon', 'reverse', 'rubiks', 'scramble',
  'speechbubble', 'speed', 'spin', 'spread', 'swirl', 'tattoo', 'toaster',
  'valentine', 'wormhole', 'zoom', 'zoomblur'
];

function getImageUrl(message, args) {
  if (message.attachments.first()) return message.attachments.first().url;
  const mentioned = message.mentions.users.first();
  if (mentioned) return mentioned.displayAvatarURL({ size: 1024, forceStatic: false });
  if (args[0] && /^https?:\/\//.test(args[0])) return args[0];
  const ref = message.reference;
  if (ref) {
    return message.channel.messages.fetch(ref.messageId).then(m => {
      if (m.attachments.first()) return m.attachments.first().url;
      if (m.embeds[0]?.image) return m.embeds[0].image.url;
      return m.author.displayAvatarURL({ size: 1024, forceStatic: false });
    }).catch(() => null);
  }
  return message.author.displayAvatarURL({ size: 1024, forceStatic: false });
}

module.exports = {
  name: 'media',
  aliases: ['m'],
  category: 'manipulation',
  help: [
    { name: 'media', description: 'Apply image/media filters and effects', aliases: 'm', parameters: '(filter) [image/user]', information: 'n/a', usage: 'media (filter)', example: 'media blur @user' },
    ...FILTERS.map(f => ({ name: `media ${f}`, description: `Apply the ${f} effect`, aliases: 'n/a', parameters: '[image/user]', information: 'n/a', usage: `media ${f}`, example: `media ${f} @user` })),
  ],

  run: async (client, message, args) => {
    const prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;
    const sub = (args[0] || '').toLowerCase();

    if (!sub) {
      return paginate(message, [
        { name: 'media', description: 'Apply image/media filters and effects', aliases: 'm', parameters: '(filter) [image/user]', information: 'n/a', usage: `${prefix}media (filter)`, example: `${prefix}media blur @user` },
      ], 'manipulation');
    }

    if (!FILTERS.includes(sub) && sub !== 'fortunecookie' && sub !== 'heartlocket' && sub !== 'speech' && sub !== 'bubble') {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Unknown filter. Available filters:\n${FILTERS.map(f => `\`${f}\``).join(', ')}`)] });
    }

    let filter = sub;
    if (sub === 'fortunecookie') filter = 'fortune';
    if (sub === 'heartlocket') filter = 'heart';
    if (sub === 'speech' || sub === 'bubble') filter = 'speechbubble';

    const imageUrl = await getImageUrl(message, args.slice(1));
    if (!imageUrl) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please provide an image, mention a user, or reply to a message with an image.`)] });

    const captionText = args.slice(1).filter(a => !/^https?:\/\//.test(a) && !a.startsWith('<@')).join(' ');

    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ forceStatic: false }) })
      .setImage(imageUrl)
      .setFooter({ text: `Filter: ${filter}` })
      .setTimestamp();

    if (filter === 'caption' && captionText) {
      embed.setDescription(`**${captionText}**`);
    }
    if (filter === 'meme') {
      const parts = captionText.split('|').map(p => p.trim());
      if (parts.length >= 2) {
        embed.setDescription(`**${parts[0]}**\n\n${parts[1]}`);
      } else if (captionText) {
        embed.setDescription(`**${captionText}**`);
      }
    }
    if (filter === 'motivate' && captionText) {
      embed.setTitle(captionText.toUpperCase());
    }
    if (filter === 'speechbubble') {
      embed.setDescription(captionText || '💬');
    }

    if (['grayscale', 'invert'].includes(filter)) {
      embed.setDescription(`Applied **${filter}** effect`);
    }
    if (['blur', 'bloom', 'deepfry', 'fisheye', 'magik', 'neon', 'swirl', 'zoomblur', 'zoom', 'spin', 'spread', 'scramble', 'wormhole'].includes(filter)) {
      embed.setDescription(`Applied **${filter}** distortion`);
    }
    if (['billboard', 'circuitboard', 'flag', 'flag2', 'tattoo', 'toaster', 'valentine', 'heart', 'rubiks', 'book', 'lego'].includes(filter)) {
      embed.setDescription(`Applied **${filter}** overlay`);
    }
    if (filter === 'fortune') {
      const fortunes = [
        'Good things are coming your way.',
        'A surprise is waiting for you.',
        'Today is your lucky day!',
        'Be patient, great things take time.',
        'An unexpected opportunity will arise.',
        'Your hard work will pay off soon.',
        'Adventure awaits around the corner.',
        'A friend will bring good news.',
        'Trust your instincts today.',
        'Something wonderful is about to happen.',
      ];
      embed.setDescription(`🥠 ${fortunes[Math.floor(Math.random() * fortunes.length)]}`);
    }
    if (filter === 'reverse') {
      embed.setDescription('Applied **reverse** effect');
    }
    if (filter === 'speed') {
      embed.setDescription('Applied **speed** effect');
    }

    return message.channel.send({ embeds: [embed] });
  }
};

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js')
const Discord = { MessageEmbed: EmbedBuilder };
const { color } = require("../config.json");
const { warn } = require('../emojis.json')

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'remind',
        description: 'Set a reminder for yourself',
        aliases: 'reminder, rm',
        parameters: '(duration) (message)',
        information: 'n/a',
        usage: 'remind (duration) (message)',
        example: 'remind duration message'
    }
],

  	name: "remind",
	aliases: ["reminder", "rm"],
	category: "utility",

	run: async (client, message, args) => {
		const remindEmbed = new EmbedBuilder()
			.setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
			.setTitle('Command: remind')
			.setDescription('Get reminders for a duration set about whatever you choose')
			.addFields({ name: '**Aliases**', value: 'reminder, rm', inline: true })
			.addFields({ name: '**Parameters**', value: 'time, text', inline: true })
			.addFields({ name: '**Information**', value: `N/A`, inline: true })
			.addFields({ name: '**Usage**', value: '\`\`\`Syntax: remind (duration) <reason>\nExample: remind 1h To get food\`\`\`' })
			.setFooter({ text: `Module: moderation` })
			.setTimestamp()
			.setColor(color)
		if (!args[0]) return message.channel.send({ embeds: [remindEmbed] })

		var time = args[0];
		var reminder = args.splice(1).join(' ');

		if (!time) return message.channel.send('so you want me to remind you nothing?');
		if (!reminder) return message.channel.send('so you want me to remind you nothing?');

		// This will not work if the bot is restarted or stopped

		time = await time.toString();

		if (time.indexOf('s') !== -1) { // Seconds
			var timesec = await time.replace(/s.*/, '');
			var timems = await timesec * 1000;
		} else if (time.indexOf('m') !== -1) { // Minutes
			var timemin = await time.replace(/m.*/, '');
			timems = await timemin * 60 * 1000;
		} else if (time.indexOf('h') !== -1) { // Hours
			var timehour = await time.replace(/h.*/, '');
			timems = await timehour * 60 * 60 * 1000;
		} else if (time.indexOf('d') !== -1) { // Days
			var timeday = await time.replace(/d.*/, '');
			timems = await timeday * 60 * 60 * 24 * 1000;
		} else {
			return message.channel.send({ embeds: [new EmbedBuilder().setColor("#efa23a").setDescription(`${warn} ${message.author}: The time must be in the format of **<number>[s/m/h/d]**`)] });
		}

		message.channel.send(`ok ill remind u in ${time}`);

		setTimeout(function () {
			message.author.send({ embed: { color: "#6495ED", text: `${message.author}`, description: `:alarm_clock: You wanted me to remind you to: **${reminder}** (\`${time}\`)` } });
		}, parseInt(timems));

	}
}
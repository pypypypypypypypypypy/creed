const { EmbedBuilder, PermissionFlagsBits } = require('discord.js')
const AppleStore = require('app-store-scraper')
const { color } = require("../config.json");

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'appstore',
        description: 'Look up an app on the App Store',
        aliases: 'n/a',
        parameters: '(app name)',
        information: 'n/a',
        usage: 'appstore (app name)',
        example: 'appstore app name'
    }
],

    name: 'appstore',

  run: async (client, message, args) => {
    let mentionedMember = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!mentionedMember) mentionedMember = message.member;

    const appStoreEmbed = new EmbedBuilder()
    .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
    .setTitle('Command: appstore')
    .setDescription('Search an app on the appstore')
    .addFields({ name: '**Aliases**', value: 'N/A', inline: true })
    .addFields({ name: '**Parameters**', value: 'search', inline: true })
    .addFields({ name: '**Information**', value: `N/A`, inline: true })
    .addFields({ name: '**Usage**', value: '\`\`\`Syntax: appstore <query>\nExample: appstore Discord\`\`\`' })
    .setFooter({ text: `Module: fun` })
    .setTimestamp()
    .setColor(color)
  if (!args[0]) return message.channel.send({ embeds: [appStoreEmbed] })

    let img = 'https://cdn4.iconfinder.com/data/icons/miu-black-social-2/60/app_store-512.png'

    AppleStore.search({
      term: args.join(' '),
      num: 1,
    }).then((data) => {
      let AppInfo

      try {
        AppInfo = JSON.parse(JSON.stringify(data[0]))
      } catch (error) {
        return message.channel.send(`No App With Name **${appname}** Found`)
      }

      let description = AppInfo.description.length > 200 ? `${AppInfo.description.substr(0, 200)}...` : AppInfo.description
      let price = AppInfo.free ? 'Free' : `$${AppInfo.price}`
      let rating = AppInfo.score.toFixed(1)

      const embed = new EmbedBuilder()
        .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
        .setTitle(`**${AppInfo.title}**`)
        .setThumbnail(AppInfo.icon)
        .setURL(AppInfo.url)
        .setTimestamp()
        .setColor(mentionedMember.displayHexColor || color)
        .setDescription(description)
        .addFields({ name: `**Price**`, value: price, inline: true })
        .addFields({ name: `**Developer**`, value: AppInfo.developer, inline: true })
        .addFields({ name: `**Rating**`, value: rating, inline: true })
        .setFooter({ text: `App Store Results`, img })
      message.channel.send({ embeds: [embed] })
    })
  }
}
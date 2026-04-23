const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const fetch = require('node-fetch');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'weather',
        description: 'Get the current weather for a location',
        aliases: 'wt, forecast',
        parameters: '(location)',
        information: 'n/a',
        usage: 'weather (location)',
        example: 'weather location'
    }
],

    name: 'weather',
  aliases: ['wt', 'forecast'],
  category: 'utility',

  run: async (client, message, args) => {
    const helpEmbed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle('Command: weather')
      .setDescription('Get the current weather for a location.')
      .addFields(
        { name: '**Aliases**', value: 'wt, forecast', inline: true },
        { name: '**Parameters**', value: '[location]', inline: true },
        { name: '**Information**', value: 'N/A', inline: true },
        { name: '**Usage**', value: '```Syntax: ,weather <location>\nExample: ,weather New York```' }
      )
      .setFooter({ text: 'Module: utility' })
      .setTimestamp()
      .setColor(color);

    if (!args[0]) return message.channel.send({ embeds: [helpEmbed] });

    const location = args.join(' ');
    const loading = await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`<a:loading:1496728277690089503> ${message.author}: Fetching weather...`)] });

    try {
      const url = `https://wttr.in/${encodeURIComponent(location)}?format=j1`;
      const res = await fetch(url, { headers: { 'User-Agent': 'curl/7.0' } });

      if (!res.ok) {
        await loading.delete().catch(() => {});
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${warn} ${message.author}: Could not find weather data for **${location}**.`)] });
      }

      const data = await res.json();
      const current = data.current_condition[0];
      const nearest = data.nearest_area[0];

      const city = nearest.areaName[0].value;
      const country = nearest.country[0].value;
      const region = nearest.region[0].value;

      const tempC = current.temp_C;
      const tempF = current.temp_F;
      const feelsC = current.FeelsLikeC;
      const feelsF = current.FeelsLikeF;
      const humidity = current.humidity;
      const windKmph = current.windspeedKmph;
      const windMph = current.windspeedMiles;
      const desc = current.weatherDesc[0].value;
      const visibility = current.visibility;
      const uvIndex = current.uvIndex;
      const cloudCover = current.cloudcover;

      const weatherEmojis = {
        'Sunny': '☀️', 'Clear': '🌙', 'Partly cloudy': '⛅', 'Cloudy': '☁️',
        'Overcast': '☁️', 'Mist': '🌫️', 'Fog': '🌫️', 'Rain': '🌧️',
        'Drizzle': '🌦️', 'Snow': '❄️', 'Sleet': '🌨️', 'Thunder': '⛈️',
        'Blizzard': '❄️', 'default': '🌡️'
      };

      const emoji = Object.entries(weatherEmojis).find(([k]) => desc.includes(k))?.[1] || weatherEmojis.default;

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${emoji} Weather for ${city}, ${region}, ${country}`)
        .setDescription(`**${desc}**`)
        .addFields(
          { name: '🌡️ Temperature', value: `${tempC}°C / ${tempF}°F`, inline: true },
          { name: '🤔 Feels Like', value: `${feelsC}°C / ${feelsF}°F`, inline: true },
          { name: '💧 Humidity', value: `${humidity}%`, inline: true },
          { name: '💨 Wind Speed', value: `${windKmph} km/h / ${windMph} mph`, inline: true },
          { name: '👁️ Visibility', value: `${visibility} km`, inline: true },
          { name: '☁️ Cloud Cover', value: `${cloudCover}%`, inline: true },
          { name: '🌞 UV Index', value: `${uvIndex}`, inline: true }
        )
        .setFooter({ text: 'Powered by wttr.in' })
        .setTimestamp();

      await loading.delete().catch(() => {});
      message.channel.send({ embeds: [embed] });
    } catch (e) {
      await loading.delete().catch(() => {});
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${warn} ${message.author}: An error occurred while fetching weather data.`)] });
    }
  }
};

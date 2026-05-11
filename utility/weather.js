const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn, loading: loadingEmoji } = require('../emojis.json');
const fetch = require('node-fetch');

const weatherEmojis = {
  'Sunny':'☀️','Clear':'🌙','Partly cloudy':'⛅','Cloudy':'☁️','Overcast':'☁️',
  'Mist':'🌫️','Fog':'🌫️','Rain':'🌧️','Drizzle':'🌦️','Snow':'❄️',
  'Sleet':'🌨️','Thunder':'⛈️','Blizzard':'❄️',
};

async function getWeather(location) {
  const res = await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=j1`, { headers: { 'User-Agent': 'curl/7.0' } });
  if (!res.ok) throw new Error('not found');
  const data = await res.json();
  const cur = data.current_condition[0];
  const area = data.nearest_area[0];
  const city = area.areaName[0].value;
  const country = area.country[0].value;
  const region = area.region[0].value;
  const desc = cur.weatherDesc[0].value;
  const emoji = Object.entries(weatherEmojis).find(([k]) => desc.includes(k))?.[1] || '🌡️';
  return new EmbedBuilder().setColor(color)
    .setTitle(`${emoji} Weather — ${city}, ${region}, ${country}`)
    .setDescription(`**${desc}**`)
    .addFields(
      { name: '🌡️ Temperature', value: `${cur.temp_C}°C / ${cur.temp_F}°F`, inline: true },
      { name: '🤔 Feels Like', value: `${cur.FeelsLikeC}°C / ${cur.FeelsLikeF}°F`, inline: true },
      { name: '💧 Humidity', value: `${cur.humidity}%`, inline: true },
      { name: '💨 Wind', value: `${cur.windspeedKmph} km/h`, inline: true },
      { name: '👁️ Visibility', value: `${cur.visibility} km`, inline: true },
      { name: '☁️ Cloud Cover', value: `${cur.cloudcover}%`, inline: true },
      { name: '🌞 UV Index', value: `${cur.uvIndex}`, inline: true },
    ).setFooter({ text: 'Powered by wttr.in' }).setTimestamp();
}

module.exports = {
  category: 'utility',
  name: 'weather',
  aliases: ['wt', 'forecast'],
  help: [{ name: 'weather', description: 'Get current weather for a location', aliases: 'wt, forecast', parameters: '(location)', information: 'n/a', usage: 'weather (location)', example: 'weather New York' }],

  slashData: {
    name: 'weather',
    description: 'Get current weather for a location',
    dm_permission: true,
    options: [{ type: 3, name: 'location', description: 'City or location', required: true }],
  },
  runSlash: async (client, interaction) => {
    const location = interaction.options.getString('location');
    await interaction.deferReply();
    try {
      const embed = await getWeather(location);
      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply({ content: `Could not find weather for **${location}**.` });
    }
  },

  run: async (client, message, args) => {
    if (!args[0]) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`,weather <location>\``)] });
    const location = args.join(' ');
    const loading = await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${loadingEmoji} Fetching weather...`)] });
    try {
      const embed = await getWeather(location);
      await loading.delete().catch(() => {});
      message.channel.send({ embeds: [embed] });
    } catch {
      await loading.delete().catch(() => {});
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${warn} ${message.author}: Could not find weather for **${location}**.`)] });
    }
  }
};

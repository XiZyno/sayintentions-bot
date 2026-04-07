const { SlashCommandBuilder } = require('discord.js');
const { getMetar } = require('../services/sayintentions');
const { parseMetar } = require('../utils/metarParser');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('metar')
    .setDescription('Gets METAR for an airport')
    .addStringOption(option =>
      option.setName('icao')
        .setDescription('Airport ICAO code')
        .setRequired(true)
    ),

  async execute(interaction) {
    // 🔥 okamžitá odpověď (žádný timeout)
    await interaction.reply('⏳ Fetching METAR...');

    try {
      const icao = interaction.options.getString('icao').toUpperCase();

      const data = await getMetar(icao);

      if (!data || !data.metar) {
        return interaction.editReply('❌ METAR not available.');
      }

      const parsed = parseMetar(data.metar);

      await interaction.editReply({
        content:
`✈️ METAR ${icao}

\`\`\`
${data.metar}
\`\`\`

🟢 ${parsed.flightCategory}
💨 Wind: ${parsed.windDir}° / ${parsed.windSpeed} kt${parsed.windGust ? ` (gust ${parsed.windGust})` : ''}
👁 Visibility: ${parsed.visibility}
🌡 Temperature: ${parsed.temp}°C / Dewpoint: ${parsed.dew}°C
📊 QNH: ${parsed.qnh} hPa
`,
        files: ['https://cdn.prod.website-files.com/677d9ab0efb4b38700f85ef5/6780ae5a9517f1701f1736c6_SayIntentions_Gold_Black_Long_Logo-p-2000.png']
      });

    } catch (error) {
      console.error('❌ METAR command error:', error);

      try {
        await interaction.editReply('❌ Something went wrong.');
      } catch (e) {
        console.error('❌ Failed to edit reply:', e);
      }
    }
  }
};
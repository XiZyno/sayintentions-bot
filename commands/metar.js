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
    // 🔥 okamžitá odpověď (anti-timeout)
    await interaction.reply('⏳ Fetching METAR...');

    try {
      const icao = interaction.options.getString('icao').toUpperCase();

      const data = await getMetar(icao);

      if (!data || !data.metar) {
        return interaction.editReply('❌ METAR not available.');
      }

      const parsed = parseMetar(data.metar);

      // ☁ CLOUD OUTPUT
      let cloudText = "☁ Clouds: N/A";

      if (parsed.clouds && parsed.clouds.length > 0) {
        cloudText = "☁ Clouds:\n";
        parsed.clouds.forEach(c => {
          cloudText += `- ${c.type} (${c.oktas}) @ ${c.height} ft\n`;
        });
      }

      // 📉 CEILING
      const ceilingText = parsed.ceiling
        ? `📉 Ceiling: ${parsed.ceiling} ft`
        : "📉 Ceiling: None";

      await interaction.editReply({
        content:
`✈️ METAR ${icao}

\`\`\`
${data.metar}
\`\`\`

🟢 ${parsed.flightCategory}
💨 Wind: ${parsed.windDir === "VRB" ? "Variable" : parsed.windDir + "°"} / ${parsed.windSpeed} kt${parsed.windGust ? ` (gust ${parsed.windGust})` : ''}${parsed.windVariableFrom ? ` (variable ${parsed.windVariableFrom}°–${parsed.windVariableTo}°)` : ''}
👁 Visibility: ${parsed.visibility}
🌡 Temperature: ${parsed.temp}°C / Dewpoint: ${parsed.dew}°C
📊 Pressure: ${parsed.pressure}

${cloudText}
${ceilingText}
`,
        files: [{
          attachment: 'https://cdn.discordapp.com/attachments/1490331583868043274/1491071534109032602/6780ae5a9517f1701f1736c6_SayIntentions_Gold_Black_Long_Logo-p-2000.png?ex=69d65c14&is=69d50a94&hm=01d19f6a7a647b7ac3e826b027acdbd0d855fe8aebe6e8001751afe777a679e4&',
          name: 'metar.png'
        }]
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
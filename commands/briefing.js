const { SlashCommandBuilder } = require('discord.js');
const { getMetar } = require('../services/sayintentions');
const { parseMetar } = require('../utils/metarParser');
const { parseAtisRunways } = require('../utils/atisParser');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('briefing')
    .setDescription('Full weather briefing (ATIS, METAR, TAF)')
    .addStringOption(option =>
      option.setName('icao')
        .setDescription('Airport ICAO code')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.reply('⏳ Fetching briefing...');

    try {
      const icao = interaction.options.getString('icao').toUpperCase();

      const data = await getMetar(icao);

      if (!data) {
        return interaction.editReply('❌ Failed to fetch data.');
      }

      const parsed = parseMetar(data.metar);
      const atisParsed = parseAtisRunways(data.atis);

      // 🛬 RUNWAY LOGIC
      let runwayText = "🛬 Runway: N/A";

      if (atisParsed.departure || atisParsed.arrival) {
        runwayText = "";

        if (atisParsed.departure) {
          runwayText += `🛫 Departure Runway: ${atisParsed.departure}\n`;
        }

        if (atisParsed.arrival) {
          runwayText += `🛬 Arrival Runway: ${atisParsed.arrival}\n`;
        }
      } else if (data.active_runway) {
        runwayText = `🛬 Active Runway: ${data.active_runway}`;
      }

      // ☁ CLOUDS
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
`✈️ BRIEFING ${icao}

📡 ATIS:
\`\`\`
${data.atis || "N/A"}
\`\`\`

\`\`\`
${data.metar || "N/A"}
\`\`\`

\`\`\`
${data.taf || "N/A"}
\`\`\`

🟢 ${parsed.flightCategory}
💨 Wind: ${parsed.windDir === "VRB" ? "Variable" : parsed.windDir + "°"} / ${parsed.windSpeed} kt${parsed.windGust ? ` (gust ${parsed.windGust})` : ''}${parsed.windVariableFrom ? ` (variable ${parsed.windVariableFrom}°–${parsed.windVariableTo}°)` : ''}
👁 Visibility: ${parsed.visibility}
🌡 Temperature: ${parsed.temp}°C / Dewpoint: ${parsed.dew}°C
📊 Pressure: ${parsed.pressure}

${runwayText}

${cloudText}
${ceilingText}
`,
        files: [{
          attachment: 'https://i.imgur.com/yourimage.png', // fix this please
          name: 'briefing.png'
        }]
      });

    } catch (error) {
      console.error('❌ Briefing error:', error);

      try {
        await interaction.editReply('❌ Something went wrong.');
      } catch {}
    }
  }
};
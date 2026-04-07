const { SlashCommandBuilder } = require('discord.js');
const { getMetar } = require('../services/sayintentions');
const { parseMetar, getFlightCategoryColor } = require('../utils/metarParser');
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
      const categoryColor = getFlightCategoryColor(parsed.flightCategory);
      const atisParsed = parseAtisRunways(data.atis);

      let runwayText = "🛬 Runway: N/A";

      // helper
      const formatRunway = (rw) => {
        if (Array.isArray(rw)) {
          return {
            text: rw.join(', '),
            plural: rw.length > 1
          };
        }
        return {
          text: rw,
          plural: false
        };
      };

      if (atisParsed.departure && atisParsed.arrival) {
        const dep = formatRunway(atisParsed.departure);
        const arr = formatRunway(atisParsed.arrival);

        if (dep.text === arr.text) {
          runwayText = `🛬 Active Runway${dep.plural ? 's' : ''}: ${dep.text}`;
        } else {
          runwayText =
            `🛫 Departure Runway${dep.plural ? 's' : ''}: ${dep.text}\n` +
            `🛬 Arrival Runway${arr.plural ? 's' : ''}: ${arr.text}`;
        }

      } else if (atisParsed.departure) {
        const dep = formatRunway(atisParsed.departure);
        runwayText = `🛫 Departure Runway${dep.plural ? 's' : ''}: ${dep.text}`;

      } else if (atisParsed.arrival) {
        const arr = formatRunway(atisParsed.arrival);
        runwayText = `🛬 Arrival Runway${arr.plural ? 's' : ''}: ${arr.text}`;

      } else if (data.active_runway) {
        runwayText = `🛬 Active Runway: ${data.active_runway}`;
      }

      let cloudText = "";
      let ceilingText = "";

      // hide clouds/ceiling if CAVOK
      if (parsed.visibility !== "CAVOK") {

        if (parsed.clouds && parsed.clouds.length > 0) {
          cloudText = "☁ Clouds:\n";

          parsed.clouds.forEach(c => {
            cloudText += `- ${c.type} (${c.oktas}) @ ${c.height} ft\n`;
          });
        } else {
          cloudText = "☁ Clouds: N/A";
        }

        ceilingText = parsed.ceiling
          ? `📉 Ceiling: ${parsed.ceiling} ft`
          : "📉 Ceiling: None";
      }

      // 🌬 WIND TEXT (new ATIS style)
      const windDirText = parsed.windDir === "VRB"
        ? "Variable"
        : `${parsed.windDir}°`;

      let windText = `💨 Wind: ${windDirText} at ${parsed.windSpeed} kts`;

      if (parsed.windGust) {
        windText += ` gusting at ${parsed.windGust} kts`;
      }

      if (parsed.windVariableFrom) {
        windText += ` (variable ${parsed.windVariableFrom}°–${parsed.windVariableTo}°)`;
      }

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

${categoryColor} **${parsed.flightCategory}**
${windText}
👁 Visibility: ${parsed.visibility}
🌡 Temperature: ${parsed.temp}°C / Dewpoint: ${parsed.dew}°C
📊 Pressure: ${parsed.pressure}

${runwayText}

${cloudText ? "\n" + cloudText : ""}
${ceilingText ? ceilingText : ""}
`,
        files: [{
          attachment: 'https://i.imgur.com/yourimage.png', // dej sem real link
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
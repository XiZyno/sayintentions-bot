const { SlashCommandBuilder } = require('discord.js');
const { getMetar } = require('../services/sayintentions');
const { parseMetar, getFlightCategoryColor, parsePrecipitation } = require('../utils/metarParser');
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
      const precipitation = parsePrecipitation(data.metar);
      const atisParsed = parseAtisRunways(data.atis);

      // ✈ RUNWAY LOGIC
      let runwayText = "🛬 Active runway: Runway in use not reported, ask an ATC";

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

      // ☁ CLOUDS + CEILING (hidden if CAVOK)
      let cloudText = "";
      let ceilingText = "";

      if (parsed.visibility !== "CAVOK") {

        if (parsed.clouds && parsed.clouds.length > 0) {
          cloudText = "☁ Clouds:\n";

          parsed.clouds.forEach(c => {
            cloudText += `- ${c.type} (${c.oktas}) @ ${c.height} ft\n`;
          });
        } else {
          cloudText = "☁ Clouds: N/A";
        }

        if (parsed.ceiling) {
          ceilingText = `📉 Ceiling: ${parsed.ceiling} ft`;
        } else {
          ceilingText = "";
        }
      }

      parsed.clouds.forEach(c => {

        if (c.type === "CLR") {
          cloudText = "☁ Clouds: Sky clear";
          return;
        }
      
        if (c.type === "SKC") {
          cloudText = "☁ Clouds: Sky clear";
          return;
        }
      
        if (c.type === "NCD") {
          cloudText = "☁ Clouds: No clouds detected";
          return;
        }
      
        if (c.type === "NSC") {
          cloudText = "☁ Clouds: No significant clouds";
          return;
        }
      
        let line = `- ${c.type} (${c.oktas}) @ ${c.height} ft`;

        const cloudTypeMap = {
          CB: "cumulonimbus",
          TCU: "towering cumulus"
        };

        if (c.cloudType) {
          const fullName = cloudTypeMap[c.cloudType] || c.cloudType;
          line += ` with ${fullName}`;
        }

        cloudText += line + "\n";
      });

      // 🌬 WIND
      const windDirText = parsed.windDir === "VRB"
        ? "Variable"
        : `${parsed.windDir}°`;

      let windText = "";

      if (parsed.windUnit === "MPS") {
        windText = `💨 Wind: ${windDirText} at ${parsed.windSpeed} m/s (${parsed.windSpeedKts} kts)`;
      
        if (parsed.windGust) {
          windText += ` gusting at ${parsed.windGust} m/s (${parsed.windGustKts} kts)`;
        }
      
      } else {
        windText = `💨 Wind: ${windDirText} at ${parsed.windSpeed} kts`;
      
        if (parsed.windGust) {
          windText += ` gusting at ${parsed.windGust} kts`;
        }
      }

      if (parsed.windVariableFrom) {
        windText += ` (variable ${parsed.windVariableFrom}°–${parsed.windVariableTo}°)`;
      }

      // 🌧 PRECIPITATION
      let precipText = precipitation
        ? `🌧 Precipitation: ${precipitation}`
        : `🌧 Precipitation: None`;

      let rvrText = "";

      // RUNWAY VISUAL RANGE
      if (parsed.rvr && parsed.rvr.length > 0) {
        rvrText = "👁 RVR:\n";
      
        parsed.rvr.forEach(r => {
          let line = `- RWY ${r.runway} → ${r.min}`;
        
          if (r.max) {
            line += `–${r.max}`;
          }
        
          line += " m";
        
          if (r.trend) {
            line += ` (${r.trend})`;
          }
        
          rvrText += line + "\n";
        });
      }

      let vvText = "";

      if (parsed.verticalVisibility) {
        vvText = `🌫 Vertical visibility: ${parsed.verticalVisibility} ft`;
      }

      await interaction.editReply({
        content:
`✈️ BRIEFING ${icao}

📡 ATIS:
\`\`\`
${data.atis || "N/A"}
\`\`\`

📊 METAR:
\`\`\`
${data.metar || "N/A"}
\`\`\`

📈 TAF:
\`\`\`
${data.taf || "N/A"}
\`\`\`

${categoryColor} **${parsed.flightCategory}**
${windText}
${precipText}
👁 Visibility: ${parsed.visibility}
🌫 Vertical visibility: ${parsed.verticalVisibility}
${vvText ? vvText : ""}
🌡 Temperature: ${parsed.temp}°C (${parsed.tempF}°F) / Dewpoint: ${parsed.dew}°C (${parsed.dewF}°F)
📊 Pressure: ${parsed.pressure}
${rvrText ? "\n" + rvrText : ""}

${runwayText}

${cloudText ? "\n" + cloudText : ""}
${ceilingText ? ceilingText : ""}
`,
        files: [{
          attachment: 'https://i.imgur.com/yourimage.png', // sem dej reálný obrázek
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
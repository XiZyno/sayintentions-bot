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
    await interaction.editReply('⏳ Fetching briefing...');

    try {
      const icao = interaction.options.getString('icao').toUpperCase();
      const data = await getMetar(icao);

      if (!data) {
        return interaction.editReply('❌ Failed to fetch data.');
      }

      let parsed;
      if (data.metar &&  typeof data.metar === "string") {
        parsed = parseMetar(data.metar);
      } else {
        parsed = {
          flightCategory: "UNKNOWN",
          visibility: "N/A",
          clouds: [],
          ceiling: null
        };
      }

      const categoryColor = getFlightCategoryColor(parsed.flightCategory);
      const precipitation = data.metar
        ? parsePrecipitation(data.metar)
        : null;
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
        
            parsed.clouds.forEach(c => {
            
              // special cases
              if (c.type === "CLR") {
                cloudText = "☁️ Clouds: Clear skies";
                return;
              }
            
              if (c.type === "SKC") {
                cloudText = "☁️ Clouds: Sky clear";
                return;
              }
            
              if (c.type === "NCD") {
                cloudText = "☁️ Clouds: No clouds detected";
                return;
              }
            
              if (c.type === "NSC") {
                cloudText = "☁️ Clouds: No significant clouds";
                return;
              }
            
              // normal clouds
              if (!cloudText) {
                cloudText = "☁️ Clouds:\n";
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
          }
        
          // ceiling only if exists
          if (parsed.ceiling) {
            ceilingText = `📉 Ceiling: ${parsed.ceiling} ft`;
          }
        }

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
        : null;

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

      if (Number.isFinite(parsed.verticalVisibility)) {
        vvText = `🌫 Vertical visibility: ${parsed.verticalVisibility} ft`;
      }

      const lines = [];

      // HEADER
      lines.push(`✈️ BRIEFING ${icao}`);
      lines.push("");

      // ATIS
      lines.push("📡 ATIS:");
      lines.push("```");
      lines.push(data.atis || "N/A");
      lines.push("```");
      lines.push("");

      // METAR
      lines.push("📊 METAR:");
      lines.push("```");
      lines.push(data.metar || "N/A");
      lines.push("```");
      lines.push("");

      // TAF
      lines.push("📈 TAF:");
      lines.push("```");
      lines.push(data.taf || "N/A");
      lines.push("```");
      lines.push("");

      // WEATHER SUMMARY
      lines.push(`${categoryColor} **${parsed.flightCategory}**`);
      lines.push(windText);
      lines.push(`👁 Visibility: ${parsed.visibility}`);

      // OPTIONAL BLOCKS (jen když existují)
      if (cloudText) lines.push(cloudText);
      if (ceilingText) lines.push(ceilingText);
      if (vvText) lines.push(vvText);
      if (precipText) lines.push(precipText);

      // ALWAYS
      lines.push(`🌡 Temperature: ${parsed.temp}°C (${parsed.tempF}°F) / Dewpoint: ${parsed.dew}°C (${parsed.dewF}°F)`);
      lines.push(`📊 Pressure: ${parsed.pressure}`);

      if (rvrText) lines.push(rvrText);

      // RUNWAY
      lines.push("");
      lines.push(runwayText);

      // VATSIM ATC
      lines.push("");

      // FINAL OUTPUT
      await interaction.editReply({
        content: lines.join("\n")
      });

    } catch (error) {
      console.error('❌ Briefing error:', error);

      try {
        await interaction.editReply('❌ Something went wrong.');
      } catch {}
    }
    const vatsimData = await getVatsimControllers();

    let vatsimText = "🗼 VATSIM: No controllers online at this airport";

    if (vatsimData?.controllers) {
    
      const controllers = vatsimData.controllers.filter(c =>
        c.callsign.startsWith(icao)
      );
    
      if (controllers.length > 0) {
        vatsimText = "🗼 VATSIM:\n";
      
        controllers.forEach(c => {
          vatsimText += `- ${c.callsign} (${c.frequency})\n`;
        });
      
        vatsimText = vatsimText.trimEnd();
      }
    }
  }
};
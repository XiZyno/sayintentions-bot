function parseMetar(metar) {
  const result = {};

  // 🌬 WIND
  const windMatch = metar.match(/(\d{3}|VRB)(\d{2})(G(\d{2}))?KT/);

  if (windMatch) {
    result.windDir = windMatch[1];
    result.windSpeed = windMatch[2];
    result.windGust = windMatch[4] || null;

    // variable wind (270V070)
    const variableMatch = metar.match(/(\d{3})V(\d{3})/);
    if (variableMatch) {
      result.windVariableFrom = variableMatch[1];
      result.windVariableTo = variableMatch[2];
    }
  }

  // 👁 VISIBILITY
  if (metar.includes("CAVOK")) {
    result.visibility = "CAVOK";
  } else {

    // statute miles
    const visSM = metar.match(/(\d+)? ?(\d\/\d)?SM/);

    if (visSM) {
      let miles = 0;

      if (visSM[1]) {
        miles += parseInt(visSM[1]);
      }

      if (visSM[2]) {
        const [num, den] = visSM[2].split('/');
        miles += parseInt(num) / parseInt(den);
      }

      result.visibility = `${miles} statute miles`;

    } else {

      // meters
      const visMatchMeters = metar.match(/\b(\d{4})\b/);

      if (visMatchMeters) {
        const meters = visMatchMeters[1];

        if (meters === "9999") {
          result.visibility = "10 km and more";
        } else {
          result.visibility = `${meters} m`;
        }
      } else {
        result.visibility = "N/A";
      }
    }
  }

  // 🌡 TEMP / DEW
  const tempMatch = metar.match(/(M?\d{2})\/(M?\d{2})/);
  if (tempMatch) {
    result.temp = tempMatch[1].replace("M", "-");
    result.dew = tempMatch[2].replace("M", "-");
  }

    // 📊 PRESSURE (QNH / ALTIMETER)
    const qnhMatch = metar.match(/Q(\d{4})/);
    const altMatch = metar.match(/A(\d{4})/);

    if (qnhMatch) {
      result.pressure = `${qnhMatch[1]} hPa`;
    } else if (altMatch) {
      const inches = (parseInt(altMatch[1]) / 100).toFixed(2);
      result.pressure = `${inches} inHg`;
    } else {
      result.pressure = "N/A";
    }

  // ☁ CLOUDS + CEILING
  const cloudMatches = metar.match(/(FEW|SCT|BKN|OVC)(\d{3})/g);

  result.clouds = [];
  let ceiling = null;

  if (cloudMatches) {
    for (const cloud of cloudMatches) {
      const type = cloud.slice(0, 3);
      const height = parseInt(cloud.slice(3)) * 100;

      let oktas = "";
      if (type === "FEW") oktas = "1–2/8";
      if (type === "SCT") oktas = "3–4/8";
      if (type === "BKN") oktas = "5–7/8";
      if (type === "OVC") oktas = "8/8";

      result.clouds.push({
        type,
        height,
        oktas
      });

      // ceiling = lowest BKN/OVC
      if (type === "BKN" || type === "OVC") {
        if (!ceiling || height < ceiling) {
          ceiling = height;
        }
      }
    }
  }

  result.ceiling = ceiling;

  // 🟢 FLIGHT CATEGORY (basic)
  if (metar.includes("CAVOK")) {
    result.flightCategory = "VFR";
  } else if (result.ceiling && result.ceiling < 500) {
    result.flightCategory = "LIFR";
  } else if (result.ceiling && result.ceiling < 1000) {
    result.flightCategory = "IFR";
  } else if (result.ceiling && result.ceiling < 3000) {
    result.flightCategory = "MVFR";
  } else {
    result.flightCategory = "VFR";
  }

  return result;
}

function getFlightCategoryColor(category) {
  switch (category) {
    case "VFR":
      return "🟢";
    case "MVFR":
      return "🔵";
    case "IFR":
      return "🔴";
    case "LIFR":
      return "🟣";
    default:
      return "⚪";
  }
}

function parsePrecipitation(metar) {
  const emojiMap = {
    rain: "🌧",
     drizzle: "🌦",
     "rain showers": "🌦",
     snow: "❄️",
     "snow showers": "🌨",
     thunderstorm: "⛈",
     "thunderstorm with rain": "⛈",
     "thunderstorm with hail": "⛈",
     hail: "🌨",
     "small hail": "🌨",
     fog: "🌫",
     mist: "🌫",
     "freezing rain": "🌧",
     "freezing drizzle": "🌧",
     "snow grains": "❄️"
  };
  const phenomena = [
    { code: "TSRA", text: "thunderstorm with rain" },
    { code: "SHRA", text: "rain showers" },
    { code: "SHSN", text: "snow showers" },
    { code: "TSGR", text: "thunderstorm with hail" },
    { code: "FZRA", text: "freezing rain" },
    { code: "FZDZ", text: "freezing drizzle" },
    { code: "TS", text: "thunderstorm" },
    { code: "RA", text: "rain" },
    { code: "DZ", text: "drizzle" },
    { code: "SN", text: "snow" },
    { code: "SG", text: "snow grains" },
    { code: "GR", text: "hail" },
    { code: "GS", text: "small hail" },
    { code: "FG", text: "fog" },
    { code: "BR", text: "mist" },
    { code: "DU", text: "dust" },
    { code: "SA", text: "sand" },
    { code: "HZ", text: "haze" },
    { code: "FU", text: "smoke" },
    { code: "VA", text: "volcanic ash" }
  ];

  const prefixes = {
    "-": "Light",
    "+": "Heavy",
    "VC": "in vicinity",
    "MI": "shallow",
    "BC": "patches",
    "PR": "partial",
    "DR": "drifting",
    "BL": "blowing"
  };

  const matches = [];

  // split METAR into parts (safe parsing)
  const parts = metar.split(" ");

  for (const part of parts) {
    for (const p of phenomena) {

      if (part.includes(p.code)) {
        let text = p.text;

        // 🔍 prefix detection
        let intensity = "";
        let modifierBefore = "";
        let modifierAfter = "";

        // intensity
        if (part.startsWith("-")) intensity = prefixes["-"];
        if (part.startsWith("+")) intensity = prefixes["+"];

        // vicinity
        if (part.includes("VC")) {
          modifierAfter = prefixes["VC"];
        }

        // other modifiers
        if (part.startsWith("MI")) modifierBefore = prefixes["MI"];
        if (part.startsWith("BC")) modifierBefore = prefixes["BC"];
        if (part.startsWith("PR")) modifierBefore = prefixes["PR"];
        if (part.startsWith("DR")) modifierBefore = prefixes["DR"];
        if (part.startsWith("BL")) modifierBefore = prefixes["BL"];

        // 🧠 build sentence
        let final = "";

        if (intensity) final += intensity + " ";
        if (modifierBefore) final += modifierBefore + " ";

        final += text;

        if (modifierAfter) final += " " + modifierAfter;

        // 🎨 přidej emoji
        const emoji = emojiMap[text] || "🌦";

        final = `${emoji} ${final}`;

        // capitalize
        final = final.charAt(0).toUpperCase() + final.slice(1);

        matches.push(final);
      }
    }
  }

  if (matches.length === 0) return null;

  return [...new Set(matches)].join(", ");
}

module.exports = { parseMetar, getFlightCategoryColor, parsePrecipitation };
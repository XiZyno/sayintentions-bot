function parseMetar(metar) {
  const result = {
    verticalVisibility: null
  };

  // REMOVE RMK
  const cleanMetar = metar.split(" RMK")[0];

  // ✈ FLIGHT CATEGORY
  result.flightCategory = "VFR";

  // 🌬 WIND (KT + MPS support)
  let windMatch = cleanMetar.match(/(\d{3}|VRB)(\d{2})(G(\d{2}))?KT/);
  let isMPS = false;

  if (!windMatch) {
    windMatch = cleanMetar.match(/(\d{3}|VRB)(\d{2})(G(\d{2}))?MPS/);
    isMPS = true;
  }

  if (windMatch) {
    result.windDir = windMatch[1];

    let speed = parseInt(windMatch[2]);
    let gust = windMatch[4] ? parseInt(windMatch[4]) : null;

    if (isMPS) {
      result.windUnit = "MPS";

      result.windSpeed = speed;
      result.windGust = gust;

      // conversion to kts
      result.windSpeedKts = Math.round(speed * 1.94384);
      result.windGustKts = gust ? Math.round(gust * 1.94384) : null;

    } else {
      result.windUnit = "KT";

      result.windSpeed = speed;
      result.windGust = gust;

      result.windSpeedKts = speed;
      result.windGustKts = gust;
    }
  }

  // 🌬 VARIABLE WIND
  const varWind = cleanMetar.match(/(\d{3})V(\d{3})/);
  if (varWind) {
    result.windVariableFrom = varWind[1];
    result.windVariableTo = varWind[2];
  }

  // 👁 VISIBILITY
  if (cleanMetar.includes("CAVOK")) {
    result.visibility = "CAVOK";
  } else {

    // 🇺🇸 / 🇨🇦 SM
    const visSM = cleanMetar.match(/(\d+)? ?(\d\/\d)?SM/);

    if (visSM) {
      let miles = 0;

      if (visSM[1]) miles += parseInt(visSM[1]);

      if (visSM[2]) {
        const [num, den] = visSM[2].split('/');
        miles += parseInt(num) / parseInt(den);
      }

      if (miles === 10) {
        result.visibility = "10 statute miles or more";
      } else {
        let unit = "statute miles";
      
        if (miles <= 1) unit = "statute mile";
      
        result.visibility = `${miles} ${unit}`;
      }

    } else {
      const visMatch = cleanMetar.match(/\b(\d{4})\b(?:\s+(\d{4})([A-Z]{1,2}))?/);

      if (visMatch) {
        const mainVis = parseInt(visMatch[1], 10);
        const dirVis = visMatch[2] ? parseInt(visMatch[2], 10) : null;
        const direction = visMatch[3];
            
        if (mainVis === "9999") {
          result.visibility = "10 km and more";
        } else {
          result.visibility = `${mainVis} m`;
        
          if (dirVis && direction) {
            result.visibility += ` (${dirVis} m ${direction})`;
          }
        }
      } else {
        result.visibility = "N/A";
      }
    }
  }

  // 🌫 VERTICAL VISIBILITY
  const vvMatch = cleanMetar.match(/VV(\d{3})/);

  if (vvMatch) {
    result.verticalVisibility = parseInt(vvMatch[1]) * 100;

    // VV simultaneously defines ceiling
    result.ceiling = result.verticalVisibility;
  }

    // 👁 RVR (Runway Visual Range)
  const rvrMatches = [...cleanMetar.matchAll(/R(\d{2}[LRC]?)\/([MP]?)(\d{4})(V(\d{4}))?([UDN])?/g)];
  
    if (rvrMatches.length > 0) {
    result.rvr = [];

    for (const match of rvrMatches) {
      const runway = match[1];
      const prefix = match[2]; // M / P / ""
      const value = parseInt(match[3]);
      const max = match[5] ? parseInt(match[5]) : null;
      const trend = match[6];

      const trendMap = {
        U: "improving",
        D: "decreasing",
        N: "no change"
      };

      let minText = `${value}`;

      if (prefix === "M") {
        minText = `less than ${value} meters`;
      } else if (prefix === "P") {
        minText = `more than ${value} meters`;
      }

      result.rvr.push({
        runway,
        min: minText,
        max,
        trend: trendMap[trend] || null
      });
    }
  }

  // 🌡 TEMPERATURE
  const tempMatch = cleanMetar.match(/(M?\d{2})\/(M?\d{2})/);
  if (tempMatch) {
    const parseTemp = (t) => t.startsWith("M") ? -parseInt(t.slice(1)) : parseInt(t);

    result.temp = parseTemp(tempMatch[1]);
    result.dew = parseTemp(tempMatch[2]);

    result.tempF = Math.round((result.temp * 9/5) + 32);
    result.dewF = Math.round((result.dew * 9/5) + 32);
  }

  // 📊 PRESSURE
  const qnh = cleanMetar.match(/Q(\d{4})/);
  const alt = cleanMetar.match(/A(\d{4})/);

  if (qnh) {
    result.pressure = `${qnh[1]} hPa`;
  } else if (alt) {
    result.pressure = `${(alt[1] / 100).toFixed(2)} inHg`;
  }

  // ☁ CLOUDS
  result.clouds = [];

  if (cleanMetar.includes("CLR")) {
    result.clouds.push({ type: "CLR" });
    return result;
  }

  if (cleanMetar.includes("SKC")) {
    result.clouds.push({ type: "SKC" });
    return result;
  }

  if (cleanMetar.includes("NCD")) {
    result.clouds.push({ type: "NCD" });
    return result;
  }

  if (cleanMetar.includes("NSC")) {
    result.clouds.push({ type: "NSC" });
    return result;
  }

  const cloudMatches = cleanMetar.match(/(FEW|SCT|BKN|OVC)(\d{3})(CB|TCU)?/g);

  if (cloudMatches) {
    for (const c of cloudMatches) {
      const type = match[1];
      const height = parseInt(match[2]) * 100;
      const cloudType = match[3] || null;

      const oktas = {
        FEW: "1–2/8",
        SCT: "3–4/8",
        BKN: "5–7/8",
        OVC: "8/8"
      }[type];

      result.clouds.push({ type, height, oktas, cloudType });
    }
  }

  // 📉 CEILING
  const ceilingLayer = result.clouds.find(c => c.type === "BKN" || c.type === "OVC");
  result.ceiling = ceilingLayer ? ceilingLayer.height : null;

  return result;
}


// 🎨 FLIGHT CATEGORY COLOR
function getFlightCategoryColor(category) {
  switch (category) {
    case "VFR": return "🟢";
    case "MVFR": return "🔵";
    case "IFR": return "🔴";
    case "LIFR": return "🟣";
    default: return "⚪";
  }
}


// 🌧 PRECIPITATION
function parsePrecipitation(metar) {

  // Ignore everything after a RMK in METAR
  const cleanMetar = metar.split(" RMK")[0];

  const phenomena = [
    { code: "TSRA", text: "thunderstorm with rain" },
    { code: "TSGR", text: "thunderstorm with hail" },
    { code: "SHRA", text: "rain showers" },
    { code: "SHSN", text: "snow showers" },
    { code: "FZRA", text: "freezing rain" },
    { code: "FZFG", text: "freezing fog" },
    { code: "FZDZ", text: "freezing drizzle" },
    { code: "TS", text: "thunderstorm" },
    { code: "SN", text: "snow" },
    { code: "RA", text: "rain" },
    { code: "DZ", text: "drizzle" },
    { code: "FG", text: "fog" },
    { code: "BR", text: "mist" },
    { code: "SG", text: "snow grains" },
    { code: "PL", text: "ice pellets" },
    { code: "IC", text: "ice crystals" },
    { code: "GR", text: "hail" },
    { code: "GS", text: "small hail snow pellets" },
    { code: "SA", text: "sand" },
    { code: "DU", text: "dust" },
    { code: "HZ", text: "haze" },
    { code: "FU", text: "smoke" },
    { code: "VA", text: "volcanic ash" },
    { code: "PO", text: "dust/sand whirls" },
    { code: "SQ", text: "squalls" },
    { code: "FC", text: "funnel cloud" },
    { code: "DS", text: "duststorm" },
    { code: "SS", text: "sandstorm" },
    { code: "DR", text: "low drifting" },
    { code: "MI", text: "shallow" },
    { code: "BC", text: "patches" },
  ];

  const emojiMap = {
    rain: "🌧",
    drizzle: "🌦",
    "rain showers": "🌦",
    snow: "❄️",
    "snow showers": "🌨",
    thunderstorm: "⛈",
    "thunderstorm with rain": "⛈",
    "thunderstorm with hail": "⛈",
    fog: "🌫",
    mist: "🌫",
    "freezing rain": "🌧",
    "freezing drizzle": "🌧"
  };

  const parts = cleanMetar.split(" ");

  for (const part of parts) {
    for (const p of phenomena) {

      if (part.includes(p.code)) {

        let text = p.text;

        if (part.startsWith("-")) text = `Light ${text}`;
        if (part.startsWith("+")) text = `Heavy ${text}`;
        if (part.includes("VC")) text += " in vicinity";

        text = text.charAt(0).toUpperCase() + text.slice(1);

        const emoji = emojiMap[p.text] || "🌦";

        return `${emoji} ${text}`; //ONLY MAIN PHENOMENON
      }
    }
  }

  return null;
}


module.exports = {
  parseMetar,
  getFlightCategoryColor,
  parsePrecipitation
};
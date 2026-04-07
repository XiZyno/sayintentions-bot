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

  // 👁 VISIBILITY (ICAO)
  if (metar.includes("CAVOK")) {
    result.visibility = "CAVOK";
  } else {
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

  // 🌡 TEMP / DEW
  const tempMatch = metar.match(/(M?\d{2})\/(M?\d{2})/);
  if (tempMatch) {
    result.temp = tempMatch[1].replace("M", "-");
    result.dew = tempMatch[2].replace("M", "-");
  }

  // 📊 QNH
  const qnhMatch = metar.match(/Q(\d{4})/);
  if (qnhMatch) {
    result.qnh = qnhMatch[1];
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

module.exports = { parseMetar };
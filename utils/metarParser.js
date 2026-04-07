function parseMetar(metar) {
  const result = {};

  // wind
  const windMatch = metar.match(/(\d{3})(\d{2})(G(\d{2}))?KT/);
  if (windMatch) {
    result.windDir = windMatch[1];
    result.windSpeed = windMatch[2];
    result.windGust = windMatch[4] || null;
  }

  // visibility
  if (metar.includes("CAVOK")) {
    result.visibility = "CAVOK";
  } else {
    const visMatch = metar.match(/(\d+)SM/);
    result.visibility = visMatch ? visMatch[1] + " SM" : "N/A";
  }

  // temperature
  const tempMatch = metar.match(/(M?\d{2})\/(M?\d{2})/);
  if (tempMatch) {
    result.temp = tempMatch[1].replace("M", "-");
    result.dew = tempMatch[2].replace("M", "-");
  }

  // QNH
  const qnhMatch = metar.match(/Q(\d{4})/);
  if (qnhMatch) {
    result.qnh = qnhMatch[1];
  }

  // VFR / IFR (easy)
  result.flightCategory = metar.includes("CAVOK") ? "VFR" : "UNKNOWN";

  return result;
}

module.exports = { parseMetar };
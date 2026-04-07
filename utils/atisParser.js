function parseAtisRunways(atis) {
  if (!atis) return {};

  const result = {};

  // 🛫 Departure runway
  const depMatch = atis.match(/(departure|departing) runway (\d{2}[LRC]?)/i);
  if (depMatch) {
    result.departure = depMatch[2];
  }

  // 🛬 Arrival runway
  const arrMatch = atis.match(/(arrival|landing) runway (\d{2}[LRC]?)/i);
  if (arrMatch) {
    result.arrival = arrMatch[2];
  }

  // 🔁 fallback: runway in use
  const inUseMatch = atis.match(/runway (\d{2}[LRC]?) in use/i);
  if (inUseMatch) {
    result.active = inUseMatch[1];
  }

  // 🔁 fallback: generic runway mention (méně přesné)
  const genericMatch = atis.match(/runway (\d{2}[LRC]?)/i);
  if (!result.active && genericMatch) {
    result.active = genericMatch[1];
  }

  return result;
}

module.exports = { parseAtisRunways };
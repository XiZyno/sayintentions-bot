function parseAtisRunways(atis) {
  if (!atis) return {};

  const result = {};
  const text = atis.toLowerCase();

  // 🔥 ARR + DEP (plural, např. 05L, 05R)
  const bothPluralMatch = text.match(/(arriving and departing|departing and arriving) runways ([\d,lrc\s]+)/);
  if (bothPluralMatch) {
    const runways = bothPluralMatch[2]
      .split(',')
      .map(r => r.trim().toUpperCase());

    result.departure = runways;
    result.arrival = runways;
    return result;
  }

  // 🔥 ARR + DEP (single)
  const bothMatch = text.match(/(arriving and departing|departing and arriving) runway (\d{2}[lrc]?)/);
  if (bothMatch) {
    const rw = bothMatch[2].toUpperCase();
    result.departure = rw;
    result.arrival = rw;
    return result;
  }

  // 🛫 departure runway(s)
  const depMatch = text.match(/(departure|departing) runways? ([\d,lrc\s]+)/);
  if (depMatch) {
    const runways = depMatch[2]
      .split(',')
      .map(r => r.trim().toUpperCase());

    result.departure = runways;
  }

  // 🛬 arrival runway(s)
  const arrMatch = text.match(/(arrival|arriving|landing) runways? ([\d,lrc\s]+)/);
  if (arrMatch) {
    const runways = arrMatch[2]
      .split(',')
      .map(r => r.trim().toUpperCase());

    result.arrival = runways;
  }

  // 🔁 fallback: runway in use
  const inUseMatch = text.match(/runway (\d{2}[lrc]?) in use/);
  if (inUseMatch) {
    result.active = inUseMatch[1].toUpperCase();
  }

  return result;
}

module.exports = { parseAtisRunways };
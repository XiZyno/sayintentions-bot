const axios = require('axios');
const { apiKey } = require('../config/config');

async function getWeather(icao) {
  try {
    const res = await axios.get('https://apipri.sayintentions.ai/sapi/getWX', {
      params: {
        api_key: apiKey,
        icao: icao,
        with_comms: 1
      }
    });

    return res.data;
  } catch (err) {
    console.error("API error:", err.message);
    return null;
  }
}

const weatherCache = new Map();

function extractMetarTime(metar) {
  const match = metar.match(/\b(\d{2})(\d{2})(\d{2})Z\b/);

  if (!match) return null;

  return {
    day: match[1],
    hour: match[2],
    minute: match[3],
    raw: match[0]
  };
}

function isMetarStillValid(metarTime) {
  if (!metarTime) return false;

  const now = new Date();

  const currentMinutes = now.getUTCMinutes();

  // METAR is every 30 min
  // if we're in the interval, it's valid

  const minute = parseInt(metarTime.minute, 10);

  return currentMinutes < 30
    ? minute < 30
    : minute >= 30;
}

function metarToDate(metarTime) {
  const now = new Date();

  return new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    parseInt(metarTime.day),
    parseInt(metarTime.hour),
    parseInt(metarTime.minute)
  ));
}

async function getMetar(icao) {

  const cached = weatherCache.get(icao);

  if (cached) {

    // METAR validity (30 min block)
    if (isMetarStillValid(cached.metarTime)) {
      console.log(`CACHE HIT: ${icao}`);
      return cached.data;
    }
  }

  console.log(`API FETCH: ${icao}`);

  const data = await getWeather(icao);
  const airport = data?.airports?.[0];

  if (!airport) {
    return { error: "NO_AIRPORT" };
  }
  
  if (!airport.metar) {
    return { error: "NO_METAR", data: airport };
  }

  const metarTime = extractMetarTime(airport.metar);

  weatherCache.set(icao, {
    data: airport,
    metarTime,
    timestamp: Date.now()
  });

  return airport;
}

async function getTaf(icao) {
  return await getMetar(icao);
}

async function getAtis(icao) {
  return await getMetar(icao);
}

const vatsimCache = {
  data: null,
  timestamp: 0
}

async function getVatsimControllers() {

  const now = Date.now();

  // ⏱ 5 minutes cache
  const TTL = 5 * 60 * 1000;

  if (vatsimCache.data && (now - vatsimCache.timestamp < TTL)) {
    console.log("VATSIM CACHE HIT");
    return vatsimCache.data;
  }

  try {
    console.log("VATSIM API FETCH");

    const res = await axios.get('https://apipri.sayintentions.ai/sapi/getVATSIM', {
      params: {
        api_key: apiKey
      }
    });

    if (!res.data && vatsimCache.data) {
      console.log("VATSIM FALLBACK TO CACHE");
      return vatsimCache.data;
    }

    // SAVE TO CACHE
    vatsimCache.data = res.data;
    vatsimCache.timestamp = now;

    return res.data;

  } catch (err) {
    console.error("VATSIM API error:", err.message);

    //fallback if error
    if (vatsimCache.data) {
      console.log("VATSIM ERROR -> USING CACHE");
      return vatsimCache.data;
    }
    
    return null;
  }
}

module.exports = {
  getMetar,
  getTaf,
  getAtis,
  getVatsimControllers
};
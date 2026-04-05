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

async function getMetar(icao) {
  const data = await getWeather(icao);
  return data?.airports?.[0] || null;
}

async function getTaf(icao) {
  const data = await getWeather(icao);
  return data?.airports?.[0] || null;
}

async function getAtis(icao) {
  const data = await getWeather(icao);
  return data?.airports?.[0] || null;
}

module.exports = {
  getMetar,
  getTaf,
  getAtis
};
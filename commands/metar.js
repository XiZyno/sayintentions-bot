const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getMetar } = require('../services/sayintentions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('metar')
    .setDescription('Získá METAR pro letiště')
    .addStringOption(option =>
      option.setName('icao')
        .setDescription('ICAO kód letiště')
        .setRequired(true)
    ),

  async execute(interaction) {
  try {
    console.log("🚀 Command spuštěn");

    const icao = interaction.options.getString('icao').toUpperCase();
    console.log("ICAO:", icao);

    await interaction.deferReply();
    console.log("⏳ defer OK");

    const data = await getMetar(icao);
    console.log("📡 DATA:", data);

    if (!data) {
      console.log("❌ data je null");
      return interaction.editReply('❌ Žádná data z API.');
    }

    if (!data.metar) {
      console.log("❌ není metar");
      return interaction.editReply('❌ METAR není dostupný.');
    }

    console.log("✅ posílám odpověď");

    await interaction.editReply(`METAR: ${data.metar}`);

  } catch (err) {
    console.error("❌ ERROR:", err);
    try {
      await interaction.editReply('❌ Chyba.');
    } catch {}
  }
}
};
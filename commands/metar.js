const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getMetar } = require('../services/sayintentions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('metar')
    .setDescription('Gets an airport METAR')
    .addStringOption(option =>
      option.setName('icao')
        .setDescription('Airport ICAO code')
        .setRequired(true)
    ),

  async execute(interaction) {
  try {
    console.log("🚀 Started command");

    const icao = interaction.options.getString('icao').toUpperCase();
    console.log("ICAO:", icao);

    await interaction.deferReply();
    console.log("⏳ defer OK");

    const data = await getMetar(icao);
    console.log("📡 DATA:", data);

    if (!data) {
      console.log("❌ data is null");
      return interaction.editReply('❌ No data from API.');
    }

    if (!data.metar) {
      console.log("❌ no metar");
      return interaction.editReply('❌ METAR not available.');
    }

    console.log("✅ posílám odpověď");

    await interaction.editReply(`METAR: ${data.metar}`);

  } catch (err) {
    console.error("❌ ERROR:", err);
    try {
      await interaction.editReply('❌ Error.');
    } catch {}
  }
}
};
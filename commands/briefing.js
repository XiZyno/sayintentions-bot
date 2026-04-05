const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getMetar, getTaf, getAtis } = require('../services/sayintentions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('briefing')
    .setDescription('Gets a complete briefing (ATIS, METAR, TAF)')
    .addStringOption(option =>
      option.setName('icao')
        .setDescription('Airport ICAO Code')
        .setRequired(true)
    ),

  async execute(interaction) {
    const icao = interaction.options.getString('icao').toUpperCase();

    if (!/^[A-Z]{4}$/.test(icao)) {
      return interaction.reply('❌ Invalid ICAO code.');
    }

    await interaction.deferReply();

    try {
      // calls API
      const [metarData, tafData, atisData] = await Promise.all([
        getMetar(icao),
        getTaf(icao),
        getAtis(icao)
      ]);

      if (!metarData && !tafData && !atisData) {
        return interaction.editReply('❌ Could not get any data.');
      }

      const embed = new EmbedBuilder()
        .setTitle(`✈️ Briefing ${icao}`)
        .setColor(0x00AEFF)
        .setTimestamp();

      // ATIS
      embed.addFields({
        name: '📡 ATIS',
        value: atisData?.atis
          ? `\`\`\`${atisData.atis.slice(0, 1000)}\`\`\``
          : 'Not available'
      });

      // METAR
      embed.addFields({
        name: '✈️ METAR',
        value: metarData?.metar
          ? `\`\`\`${metarData.metar}\`\`\``
          : 'Not available'
      });

      // TAF
      embed.addFields({
        name: '🌦 TAF',
        value: tafData?.taf
          ? `\`\`\`${tafData.taf.slice(0, 1000)}\`\`\``
          : 'Not available'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error("❌ Briefing error:", err);
      await interaction.editReply('❌ Error during getting a data.');
    }
  }
};
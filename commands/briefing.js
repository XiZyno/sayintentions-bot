const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getMetar, getTaf, getAtis } = require('../services/sayintentions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('briefing')
    .setDescription('Získá kompletní briefing (ATIS, METAR, TAF)')
    .addStringOption(option =>
      option.setName('icao')
        .setDescription('ICAO kód letiště')
        .setRequired(true)
    ),

  async execute(interaction) {
    const icao = interaction.options.getString('icao').toUpperCase();

    if (!/^[A-Z]{4}$/.test(icao)) {
      return interaction.reply('❌ Neplatný ICAO kód.');
    }

    await interaction.deferReply();

    try {
      // zavoláme API (klidně 3x, nebo optimalizujeme později)
      const [metarData, tafData, atisData] = await Promise.all([
        getMetar(icao),
        getTaf(icao),
        getAtis(icao)
      ]);

      if (!metarData && !tafData && !atisData) {
        return interaction.editReply('❌ Nepodařilo se získat data.');
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
          : 'Není dostupné'
      });

      // METAR
      embed.addFields({
        name: '✈️ METAR',
        value: metarData?.metar
          ? `\`\`\`${metarData.metar}\`\`\``
          : 'Není dostupné'
      });

      // TAF
      embed.addFields({
        name: '🌦 TAF',
        value: tafData?.taf
          ? `\`\`\`${tafData.taf.slice(0, 1000)}\`\`\``
          : 'Není dostupné'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error("❌ Briefing error:", err);
      await interaction.editReply('❌ Chyba při získávání dat.');
    }
  }
};
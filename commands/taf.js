const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getTaf } = require('../services/sayintentions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('taf')
    .setDescription('Získá TAF pro letiště')
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

    const data = await getTaf(icao);

    if (!data || !data.taf) {
      return interaction.editReply('❌ TAF není dostupný.');
    }

    const embed = new EmbedBuilder()
      .setTitle(`🌦 TAF ${icao}`)
      .setDescription(`\`\`\`${data.taf}\`\`\``)
      .setColor(0x00AEFF)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
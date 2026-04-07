const { SlashCommandBuilder } = require('discord.js');
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
    await interaction.deferReply();

    const icao = interaction.options.getString('icao').toUpperCase();

    const data = await getTaf(icao);

    if (!data || !data.taf) {
      return interaction.editReply('❌ TAF není dostupný.');
    }

    await interaction.editReply({
      content: `🌦 TAF ${icao}\n\`\`\`${data.taf}\`\`\``,
      files: ['https://cdn.prod.website-files.com/677d9ab0efb4b38700f85ef5/6780ae5a9517f1701f1736c6_SayIntentions_Gold_Black_Long_Logo-p-2000.png']
    });
  }
};
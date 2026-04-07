const { SlashCommandBuilder } = require('discord.js');
const { getAtis } = require('../services/sayintentions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('atis')
    .setDescription('Získá ATIS pro letiště')
    .addStringOption(option =>
      option.setName('icao')
        .setDescription('ICAO kód letiště')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const icao = interaction.options.getString('icao').toUpperCase();

    const data = await getAtis(icao);

    if (!data || !data.atis) {
      return interaction.editReply('❌ ATIS není dostupný.');
    }

    await interaction.editReply({
      content: `📡 ATIS ${icao}\n\`\`\`${data.atis}\`\`\``,
      files: ['https://cdn.prod.website-files.com/677d9ab0efb4b38700f85ef5/6780ae5a9517f1701f1736c6_SayIntentions_Gold_Black_Long_Logo-p-2000.png']
    });
  }
};
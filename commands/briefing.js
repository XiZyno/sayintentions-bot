const { SlashCommandBuilder } = require('discord.js');
const { getMetar } = require('../services/sayintentions');

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
    await interaction.deferReply();

    const icao = interaction.options.getString('icao').toUpperCase();

    const data = await getMetar(icao); // vrací celý objekt (atis, metar, taf)

    if (!data) {
      return interaction.editReply('❌ Nepodařilo se získat data.');
    }

    const atis = data.atis || 'Není dostupné';
    const metar = data.metar || 'Není dostupné';
    const taf = data.taf || 'Není dostupné';

    await interaction.editReply({
      content:
`✈️ BRIEFING ${icao}

📡 ATIS:
\`\`\`
${atis}
\`\`\`

✈️ METAR:
\`\`\`
${metar}
\`\`\`

🌦 TAF:
\`\`\`
${taf}
\`\`\``,
      files: ['https://cdn.prod.website-files.com/677d9ab0efb4b38700f85ef5/6780ae5a9517f1701f1736c6_SayIntentions_Gold_Black_Long_Logo-p-2000.png']
    });
  }
};
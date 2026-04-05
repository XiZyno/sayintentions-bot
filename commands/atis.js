const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
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
    const icao = interaction.options.getString('icao').toUpperCase();

    if (!/^[A-Z]{4}$/.test(icao)) {
      return interaction.reply('❌ Neplatný ICAO kód.');
    }

    await interaction.deferReply();

    const data = await getAtis(icao);

    if (!data || !data.atis) {
      return interaction.editReply('❌ ATIS není dostupný.');
    }

    const embed = new EmbedBuilder()
      .setTitle(`📡 ATIS ${icao}`)
      .setDescription(`\`\`\`${data.atis}\`\`\``)
      .setColor(0x00AEFF)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
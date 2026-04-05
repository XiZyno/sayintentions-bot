const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getAtis } = require('../services/sayintentions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('atis')
    .setDescription('Gets an airport ATIS')
    .addStringOption(option =>
      option.setName('icao')
        .setDescription('Airport ICAO Code')
        .setRequired(true)
    ),

  async execute(interaction) {
    const icao = interaction.options.getString('icao').toUpperCase();

    if (!/^[A-Z]{4}$/.test(icao)) {
      return interaction.reply('❌ Invalid ICAO Code.');
    }

    await interaction.deferReply();

    const data = await getAtis(icao);

    if (!data || !data.atis) {
      return interaction.editReply('❌ ATIS not available.');
    }

    const embed = new EmbedBuilder()
      .setTitle(`📡 ATIS ${icao}`)
      .setDescription(`\`\`\`${data.atis}\`\`\``)
      .setColor(0x00AEFF)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
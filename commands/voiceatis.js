const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const gTTS = require('gtts');
const fs = require('fs');
const path = require('path');
const { getAtis } = require('../services/sayintentions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voiceatis')
    .setDescription('Will play ATIS in the voice channel')
    .addStringOption(option =>
      option.setName('icao')
        .setDescription('Airport ICAO code')
        .setRequired(true)
    ),

  async execute(interaction) {
    const icao = interaction.options.getString('icao').toUpperCase();

    const channel = interaction.member.voice.channel;

    if (!channel) {
      return interaction.reply('❌ You need to be in a voice channel!');
    }

    await interaction.deferReply();

    const data = await getAtis(icao);

    if (!data || !data.atis) {
      return interaction.editReply('❌ ATIS not available.');
    }

    const text = data.atis;

    // audio file creation
    const filePath = path.join(__dirname, '../atis.mp3');
    const gtts = new gTTS(text, 'en');

    gtts.save(filePath, (err) => {
      if (err) {
        console.error(err);
        return interaction.editReply('❌ Error during voice generation.');
      }

      // connect to voice channel
      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
      });

      const player = createAudioPlayer();
      const resource = createAudioResource(filePath);

      player.play(resource);
      connection.subscribe(player);

      interaction.editReply(`🔊 Přehrávám ATIS pro ${icao}`);

      // leave voice after ATIS playedback
      player.on('idle', () => {
        connection.destroy();
        fs.unlinkSync(filePath);
      });
    });
  }
};
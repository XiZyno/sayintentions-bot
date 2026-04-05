const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, StreamType } = require('@discordjs/voice');
const gTTS = require('gtts');
const fs = require('fs');
const path = require('path');
require('ffmpeg-static');

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
    await interaction.deferReply();

    const icao = interaction.options.getString('icao').toUpperCase();
    const channel = interaction.member.voice.channel;

    if (!channel) {
      return interaction.editReply('❌ You need to be in a voice channel!');
    }

    const data = await getAtis(icao);

    if (!data || !data.atis) {
      return interaction.editReply('❌ ATIS not available.');
    }

    const text = data.atis;
    const filePath = path.join(__dirname, '../atis.mp3');

    const gtts = new gTTS(text, 'en');

    console.log("🎤 Generating TTS...");

    gtts.save(filePath, (err) => {
      if (err) {
        console.error(err);
        return interaction.editReply('❌ Error during voice generation.');
      }

      console.log("✅ TTS done");

      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
      });

      const player = createAudioPlayer();

      const resource = createAudioResource(fs.createReadStream(filePath), {
        inputType: StreamType.Arbitrary,
        inlineVolume: true
      });

      resource.volume.setVolume(1); // 🔥 volume

      player.play(resource);
      connection.subscribe(player);

      interaction.editReply(`🔊 Playing ATIS for ${icao}`);

      player.on('error', error => {
        console.error('❌ Player error:', error);
      });

      player.on('idle', () => {
        connection.destroy();
        fs.unlinkSync(filePath);
      });
    });
  }
};
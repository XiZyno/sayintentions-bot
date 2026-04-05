const { REST, Routes } = require('discord.js');
const { clientId, guildId, token } = require('./config/config');
const fs = require('fs');

const commands = [];
const commandFiles = fs.readdirSync('./commands');

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('⏳ Registruji commandy...');

    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands }
    );

    console.log('✅ Commands registered');
  } catch (error) {
    console.error(error);
  }
})();
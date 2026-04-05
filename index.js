require('http').createServer((req, res) => {
  res.writeHead(200);
  res.end('Bot is running');
}).listen(process.env.PORT || 3000);

const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { token } = require('./config/config');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.commands = new Collection();

// command load
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath);

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);

  // controls if there's data + execute
  if (!command.data || !command.execute) {
    console.log(`❌ Wrong command: ${file}`);
    continue;
  }

  client.commands.set(command.data.name, command);
  console.log(`✅ Loaded command: ${command.data.name}`);
}

// bot ready
client.once('clientReady', () => {
  console.log(`🟢 Bot logged in as ${client.user.tag}`);
});

// listening for commands
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  console.log(`📥 Command: ${interaction.commandName}`);

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.log('❌ Command not found');
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error('❌ ERROR during execute:', error);

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply('❌ Something went wrong.');
    } else {
      await interaction.reply('❌ Something went wrong.');
    }
  }
});

// login
client.login(token);
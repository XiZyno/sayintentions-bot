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

// načtení commandů
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath);

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);

  // kontrola jestli má data + execute
  if (!command.data || !command.execute) {
    console.log(`❌ Chybný command: ${file}`);
    continue;
  }

  client.commands.set(command.data.name, command);
  console.log(`✅ Načten command: ${command.data.name}`);
}

// bot ready
client.once('ready', () => {
  console.log(`🟢 Bot přihlášen jako ${client.user.tag}`);
});

// poslouchání commandů
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  console.log(`📥 Command: ${interaction.commandName}`);

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.log('❌ Command nenalezen');
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error('❌ ERROR při execute:', error);

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply('❌ Nastala chyba.');
    } else {
      await interaction.reply('❌ Nastala chyba.');
    }
  }
});

// přihlášení
client.login(token);
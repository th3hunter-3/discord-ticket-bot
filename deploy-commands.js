/**
 * Deploy Commands Script
 * Registers slash commands with Discord API
 */

import { REST, Routes } from 'discord.js';
import { config as dotenvConfig } from 'dotenv';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenvConfig();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const commands = [];
const commandsPath = join(__dirname, 'commands');

// Validate environment variables
if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) {
  console.error('❌ Missing DISCORD_TOKEN or CLIENT_ID in .env file');
  process.exit(1);
}

/**
 * Load all commands
 */
async function loadCommands() {
  try {
    const commandFolders = readdirSync(commandsPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    console.log(`📂 Loading commands from ${commandFolders.length} folders...`);

    for (const folder of commandFolders) {
      const folderPath = join(commandsPath, folder);
      const commandFiles = readdirSync(folderPath).filter(file => 
        file.endsWith('.js') && !file.startsWith('_')
      );

      for (const file of commandFiles) {
        const filePath = join(folderPath, file);
        const fileUrl = `file://${filePath}`;
        
        try {
          const command = await import(fileUrl);
          
          if ('data' in command.default && 'execute' in command.default) {
            commands.push(command.default.data.toJSON());
            console.log(`  ✅ Loaded: ${command.default.data.name}`);
          }
        } catch (error) {
          console.error(`  ❌ Error loading ${folder}/${file}:`, error.message);
        }
      }
    }

    console.log(`\n📦 Total commands loaded: ${commands.length}`);
    
  } catch (error) {
    console.error('❌ Error loading commands:', error);
    process.exit(1);
  }
}

/**
 * Deploy commands to Discord
 */
async function deployCommands() {
  try {
    const rest = new REST().setToken(process.env.DISCORD_TOKEN);

    console.log('\n🚀 Starting deployment...');

    // Deploy globally or to a specific guild
    if (process.env.GUILD_ID) {
      console.log(`📍 Deploying to guild: ${process.env.GUILD_ID}`);
      
      const data = await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );

      console.log(`✅ Successfully deployed ${data.length} commands to guild!`);
    } else {
      console.log('🌍 Deploying globally (this may take up to 1 hour to propagate)...');
      
      const data = await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
      );

      console.log(`✅ Successfully deployed ${data.length} commands globally!`);
    }

  } catch (error) {
    console.error('❌ Error deploying commands:', error);
    process.exit(1);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🎫 Discord Ticket Bot - Command Deployment\n');
  
  await loadCommands();
  await deployCommands();
  
  console.log('\n✨ Deployment complete!');
  console.log('You can now start your bot with: npm start');
}

main();

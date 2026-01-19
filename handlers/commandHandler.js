/**
 * Command Handler
 * Dynamically loads and manages slash commands
 */

import { Collection } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load all commands from the commands directory
 * @param {Client} client - Discord client
 * @returns {Promise<Collection>} Collection of commands
 */
export async function loadCommands(client) {
  const commands = new Collection();
  const commandsPath = join(__dirname, '..', 'commands');
  
  try {
    // Get all subdirectories in commands folder
    const commandFolders = readdirSync(commandsPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    logger.info(`Loading commands from ${commandFolders.length} folders...`);

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
            commands.set(command.default.data.name, command.default);
            logger.debug(`Loaded command: ${command.default.data.name} from ${folder}/${file}`);
          } else {
            logger.warn(`Command at ${folder}/${file} is missing required "data" or "execute" property`);
          }
        } catch (error) {
          logger.error(`Error loading command from ${folder}/${file}:`, error);
        }
      }
    }

    logger.info(`Successfully loaded ${commands.size} commands`);
    return commands;
    
  } catch (error) {
    logger.error('Error loading commands:', error);
    return commands;
  }
}

/**
 * Reload a specific command
 * @param {Client} client - Discord client
 * @param {string} commandName - Name of the command to reload
 * @returns {Promise<boolean>} Success status
 */
export async function reloadCommand(client, commandName) {
  const command = client.commands.get(commandName);
  
  if (!command) {
    logger.warn(`Command ${commandName} not found`);
    return false;
  }

  try {
    const commandsPath = join(__dirname, '..', 'commands');
    const commandFolders = readdirSync(commandsPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const folder of commandFolders) {
      const folderPath = join(commandsPath, folder);
      const commandFiles = readdirSync(folderPath).filter(file => file.endsWith('.js'));

      for (const file of commandFiles) {
        const filePath = join(folderPath, file);
        const fileUrl = `file://${filePath}?update=${Date.now()}`; // Cache busting
        
        try {
          const newCommand = await import(fileUrl);
          
          if (newCommand.default.data.name === commandName) {
            client.commands.set(commandName, newCommand.default);
            logger.info(`Reloaded command: ${commandName}`);
            return true;
          }
        } catch (error) {
          // Continue to next file
        }
      }
    }

    logger.warn(`Could not find command file for: ${commandName}`);
    return false;
    
  } catch (error) {
    logger.error(`Error reloading command ${commandName}:`, error);
    return false;
  }
}

/**
 * Get command by name
 * @param {Client} client - Discord client
 * @param {string} commandName - Command name
 * @returns {Object|undefined} Command object
 */
export function getCommand(client, commandName) {
  return client.commands.get(commandName);
}

/**
 * Check if user has permission to use command
 * @param {CommandInteraction} interaction - Command interaction
 * @param {Array<string>} requiredPermissions - Required permissions
 * @returns {boolean} Whether user has permission
 */
export function hasPermission(interaction, requiredPermissions = []) {
  if (requiredPermissions.length === 0) return true;
  
  const member = interaction.member;
  
  // Owner bypass
  const ownerIds = process.env.OWNER_IDS?.split(',') || [];
  if (ownerIds.includes(interaction.user.id)) return true;
  
  // Check permissions
  return member.permissions.has(requiredPermissions);
}

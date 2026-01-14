/**
 * Interaction Create Event
 * Handles all interactions (commands, buttons, modals, select menus)
 */

import logger from '../utils/logger.js';
import { hasPermission } from '../handlers/commandHandler.js';
import guildWhitelist from '../middleware/GuildWhitelist.js';
import healthMonitor from '../services/HealthMonitor.js';
import config from '../config.js';

export default {
  name: 'interactionCreate',
  
  /**
   * Execute interaction
   * @param {Interaction} interaction - Discord interaction
   */
  async execute(interaction) {
    // Check whitelist for guild commands
    if (interaction.guild && !guildWhitelist.isWhitelisted(interaction.guild.id)) {
      if (interaction.isChatInputCommand()) {
        const allowed = await guildWhitelist.checkCommand(interaction);
        if (!allowed) return;
      }
    }

    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      await handleCommand(interaction);
    }
    
    // Handle button interactions
    else if (interaction.isButton()) {
      await handleButton(interaction);
    }
    
    // Handle modal submissions
    else if (interaction.isModalSubmit()) {
      await handleModal(interaction);
    }
    
    // Handle select menu interactions
    else if (interaction.isStringSelectMenu()) {
      await handleSelectMenu(interaction);
    }
  }
};

/**
 * Handle slash command
 * @param {CommandInteraction} interaction - Command interaction
 */
async function handleCommand(interaction) {
  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    logger.warn(`Command not found: ${interaction.commandName}`);
    return;
  }

  try {
    logger.info(`Command executed: ${interaction.commandName} by ${interaction.user.tag} in ${interaction.guild?.name || 'DM'}`);

    // Record command execution
    healthMonitor.recordCommand();

    // Check permissions if required
    if (command.permissions && !hasPermission(interaction, command.permissions)) {
      return await interaction.reply({
        content: '❌ You do not have permission to use this command.',
        ephemeral: true
      });
    }

    // Execute command
    await command.execute(interaction);
    
  } catch (error) {
    logger.error(`Error executing command ${interaction.commandName}:`, error);
    healthMonitor.recordError();
    
    const errorMessage = config.bot.debug 
      ? `❌ An error occurred: \`${error.message}\``
      : '❌ An error occurred while executing this command.';

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: errorMessage, ephemeral: true });
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
}

/**
 * Handle button interaction
 * @param {ButtonInteraction} interaction - Button interaction
 */
async function handleButton(interaction) {
  try {
    const [action, ...args] = interaction.customId.split('_');
    
    logger.debug(`Button clicked: ${interaction.customId} by ${interaction.user.tag}`);

    // Import button handlers dynamically
    switch (action) {
      case 'ticket':
        const { handleTicketButton } = await import('../utils/ticketHandler.js');
        await handleTicketButton(interaction, args);
        break;
      
      case 'close':
        const { handleCloseButton } = await import('../utils/ticketHandler.js');
        await handleCloseButton(interaction);
        break;
      
      case 'claim':
        const { handleClaimButton } = await import('../utils/ticketHandler.js');
        await handleClaimButton(interaction);
        break;
        
      default:
        logger.warn(`Unknown button action: ${action}`);
    }
  } catch (error) {
    logger.error('Error handling button:', error);
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ An error occurred while processing your request.',
        ephemeral: true
      });
    }
  }
}

/**
 * Handle modal submission
 * @param {ModalSubmitInteraction} interaction - Modal interaction
 */
async function handleModal(interaction) {
  try {
    const [action, ...args] = interaction.customId.split('_');
    
    logger.debug(`Modal submitted: ${interaction.customId} by ${interaction.user.tag}`);

    // Import modal handlers dynamically
    switch (action) {
      case 'ticket':
        const { handleTicketModal } = await import('../utils/ticketHandler.js');
        await handleTicketModal(interaction, args);
        break;
      
      case 'close':
        const { handleCloseNoteModal } = await import('../utils/ticketHandler.js');
        await handleCloseNoteModal(interaction, args);
        break;
        
      default:
        logger.warn(`Unknown modal action: ${action}`);
    }
  } catch (error) {
    logger.error('Error handling modal:', error);
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ An error occurred while processing your request.',
        ephemeral: true
      });
    }
  }
}

/**
 * Handle select menu interaction
 * @param {StringSelectMenuInteraction} interaction - Select menu interaction
 */
async function handleSelectMenu(interaction) {
  try {
    const [action, ...args] = interaction.customId.split('_');
    
    logger.debug(`Select menu used: ${interaction.customId} by ${interaction.user.tag}`);

    // Import select menu handlers dynamically
    switch (action) {
      case 'ticket':
        const { handleTicketSelect } = await import('../utils/ticketHandler.js');
        await handleTicketSelect(interaction, args);
        break;
        
      default:
        logger.warn(`Unknown select menu action: ${action}`);
    }
  } catch (error) {
    logger.error('Error handling select menu:', error);
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ An error occurred while processing your request.',
        ephemeral: true
      });
    }
  }
}

/**
 * Discord Ticket Bot
 * Main entry point
 * 
 * A sophisticated, production-ready Discord Ticket Bot with:
 * - Modular command and event handling
 * - Hybrid ticket system (server-based + modmail)
 * - MongoDB persistence
 * - Rate limiting and security features
 * - HTML transcript generation
 * - Professional logging with Winston
 */

import { Client, GatewayIntentBits, Collection, Partials } from 'discord.js';
import { config as dotenvConfig } from 'dotenv';
import logger from './utils/logger.js';
import { loadCommands } from './handlers/commandHandler.js';
import { loadEvents } from './handlers/eventHandler.js';
import { connectDatabase } from './models/database.js';
import { validateEnvironment, validateOwnerIds, validateConfig, getEnvironmentInfo } from './utils/validator.js';
import config from './config.js';

// Load environment variables
dotenvConfig();

// Validate environment and configuration
if (!validateEnvironment()) {
  process.exit(1);
}

if (!validateOwnerIds()) {
  process.exit(1);
}

if (!validateConfig(config)) {
  process.exit(1);
}

// Log environment info
const envInfo = getEnvironmentInfo();
logger.info('Environment:', envInfo);

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers
  ],
  partials: [
    Partials.Channel, // Required for DMs
    Partials.Message
  ]
});

// Initialize collections
client.commands = new Collection();
client.config = config;

/**
 * Global error handlers
 */
process.on('unhandledRejection', async (error) => {
  logger.error('Unhandled Promise Rejection:', error);
  
  // Send error to webhook if configured
  if (process.env.ERROR_WEBHOOK_URL) {
    try {
      const { WebhookClient, EmbedBuilder } = await import('discord.js');
      const webhookClient = new WebhookClient({ url: process.env.ERROR_WEBHOOK_URL });
      
      const embed = new EmbedBuilder()
        .setColor(config.colors.error)
        .setTitle('❌ Unhandled Promise Rejection')
        .setDescription(`\`\`\`${error.stack || error.message || 'Unknown error'}\`\`\`.substring(0, 4000)`)
        .setTimestamp();
      
      await webhookClient.send({ embeds: [embed] });
    } catch (webhookError) {
      logger.error('Failed to send error to webhook:', webhookError);
    }
  }
});

process.on('uncaughtException', async (error) => {
  logger.error('Uncaught Exception:', error);
  
  // Send error to webhook if configured
  if (process.env.ERROR_WEBHOOK_URL) {
    try {
      const { WebhookClient, EmbedBuilder } = await import('discord.js');
      const webhookClient = new WebhookClient({ url: process.env.ERROR_WEBHOOK_URL });
      
      const embed = new EmbedBuilder()
        .setColor(config.colors.error)
        .setTitle('❌ Uncaught Exception')
        .setDescription(`\`\`\`${error.stack || error.message || 'Unknown error'}\`\`\`.substring(0, 4000)`)
        .setTimestamp();
      
      await webhookClient.send({ embeds: [embed] });
    } catch (webhookError) {
      logger.error('Failed to send error to webhook:', webhookError);
    }
  }
  
  // Exit gracefully
  process.exit(1);
});

/**
 * Graceful shutdown
 */
async function shutdown(signal) {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  
  try {
    // Destroy client
    if (client) {
      await client.destroy();
      logger.info('Discord client destroyed');
    }
    
    // Disconnect database
    const { disconnectDatabase } = await import('./models/database.js');
    await disconnectDatabase();
    
    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

/**
 * Initialize bot
 */
async function init() {
  try {
    logger.info('Starting Discord Ticket Bot...');
    
    // Connect to database
    await connectDatabase();
    
    // Load commands
    client.commands = await loadCommands(client);
    
    // Load events
    await loadEvents(client);
    
    // Login to Discord
    await client.login(process.env.DISCORD_TOKEN);
    
  } catch (error) {
    logger.error('Failed to initialize bot:', error);
    process.exit(1);
  }
}

// Start the bot
init();

export default client;

/**
 * Ready Event
 * Fired when the bot is ready
 */

import { ActivityType } from 'discord.js';
import logger from '../utils/logger.js';
import config from '../config.js';

export default {
  name: 'ready',
  once: true,
  
  /**
   * Execute ready event
   * @param {Client} client - Discord client
   */
  async execute(client) {
    logger.info(`Logged in as ${client.user.tag}!`);
    logger.info(`Bot is ready in ${client.guilds.cache.size} guilds`);
    
    // Set bot presence
    client.user.setPresence({
      status: config.bot.presence.status,
      activities: [{
        name: config.bot.presence.activity.name,
        type: ActivityType.Watching
      }]
    });

    // Log debug information if debug mode is enabled
    if (config.bot.debug) {
      logger.debug('Debug mode is enabled');
      logger.debug(`Loaded ${client.commands.size} commands`);
      logger.debug(`Guild IDs: ${client.guilds.cache.map(g => g.id).join(', ')}`);
    }

    logger.info('Bot is ready!');
  }
};

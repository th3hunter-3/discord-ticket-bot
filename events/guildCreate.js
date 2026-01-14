/**
 * Guild Create Event
 * Handles bot joining guilds - whitelist enforcement
 */

import logger from '../utils/logger.js';
import guildWhitelist from '../middleware/GuildWhitelist.js';

export default {
  name: 'guildCreate',
  
  /**
   * Execute guild create event
   * @param {Guild} guild - Discord guild
   */
  async execute(guild) {
    logger.info(`Bot joined guild: ${guild.name} (${guild.id}) - Members: ${guild.memberCount}`);

    // Handle whitelist
    await guildWhitelist.handleGuildJoin(guild, guild.client);
  }
};

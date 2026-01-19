/**
 * Guild Whitelist Middleware
 * Restricts bot to whitelisted servers only
 */

import logger from '../utils/logger.js';
import { EmbedBuilder } from 'discord.js';

class GuildWhitelist {
  constructor() {
    // Whitelisted guild IDs
    this.whitelist = new Set(
      (process.env.WHITELISTED_GUILDS || '').split(',').filter(Boolean)
    );
    
    // Open mode (allow all guilds)
    this.openMode = process.env.WHITELIST_MODE !== 'strict';
  }

  /**
   * Check if guild is whitelisted
   * @param {string} guildId - Guild ID
   * @returns {boolean} Whether guild is whitelisted
   */
  isWhitelisted(guildId) {
    if (this.openMode) return true;
    return this.whitelist.has(guildId);
  }

  /**
   * Add guild to whitelist
   * @param {string} guildId - Guild ID
   */
  addGuild(guildId) {
    this.whitelist.add(guildId);
    logger.info(`Guild ${guildId} added to whitelist`);
  }

  /**
   * Remove guild from whitelist
   * @param {string} guildId - Guild ID
   */
  removeGuild(guildId) {
    this.whitelist.delete(guildId);
    logger.info(`Guild ${guildId} removed from whitelist`);
  }

  /**
   * Get all whitelisted guilds
   * @returns {Array<string>} Guild IDs
   */
  getWhitelist() {
    return Array.from(this.whitelist);
  }

  /**
   * Check if command can execute in guild
   * @param {CommandInteraction} interaction - Command interaction
   * @returns {boolean} Whether command can execute
   */
  async checkCommand(interaction) {
    if (!interaction.guild) return true; // Allow DMs
    
    if (!this.isWhitelisted(interaction.guild.id)) {
      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Access Denied')
        .setDescription('This bot is not authorized to operate in this server.')
        .addFields({
          name: 'Request Access',
          value: 'Contact the bot owner to request access for this server.'
        });

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return false;
    }

    return true;
  }

  /**
   * Handle guild join
   * @param {Guild} guild - Discord guild
   * @param {Client} client - Discord client
   */
  async handleGuildJoin(guild, client) {
    if (!this.isWhitelisted(guild.id)) {
      logger.warn(`Bot joined non-whitelisted guild: ${guild.name} (${guild.id})`);
      
      // Send message to owner
      if (guild.systemChannel) {
        const embed = new EmbedBuilder()
          .setColor('#FFA500')
          .setTitle('⚠️ Authorization Required')
          .setDescription('This bot requires authorization to operate in your server.')
          .addFields(
            { name: 'Status', value: 'Not Whitelisted' },
            { name: 'Action', value: 'The bot will not respond to commands until authorized.' },
            { name: 'Contact', value: 'Please contact the bot owner to request access.' }
          )
          .setFooter({ text: 'Guild ID: ' + guild.id });

        await guild.systemChannel.send({ embeds: [embed] }).catch(() => {});
      }

      // Notify bot owner
      const ownerIds = (process.env.OWNER_IDS || '').split(',');
      for (const ownerId of ownerIds) {
        try {
          const owner = await client.users.fetch(ownerId);
          
          const embed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('🆕 New Guild Join Request')
            .setDescription(`Bot was added to a non-whitelisted guild.`)
            .addFields(
              { name: 'Guild', value: guild.name, inline: true },
              { name: 'Guild ID', value: guild.id, inline: true },
              { name: 'Members', value: guild.memberCount.toString(), inline: true },
              { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true }
            )
            .setTimestamp();

          await owner.send({ embeds: [embed] });
        } catch (error) {
          logger.error('Failed to notify owner:', error);
        }
      }
    }
  }

  /**
   * Enable strict mode
   */
  enableStrictMode() {
    this.openMode = false;
    logger.info('Whitelist strict mode enabled');
  }

  /**
   * Enable open mode
   */
  enableOpenMode() {
    this.openMode = true;
    logger.info('Whitelist open mode enabled');
  }
}

// Export singleton instance
export default new GuildWhitelist();

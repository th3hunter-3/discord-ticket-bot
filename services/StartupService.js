/**
 * Startup Service
 * Performs comprehensive health checks and synchronization on bot startup
 */

import logger from '../utils/logger.js';
import Ticket from '../models/Ticket.js';
import GuildConfig from '../models/GuildConfig.js';
import { PermissionFlagsBits } from 'discord.js';

class StartupService {
  constructor() {
    this.checks = [];
    this.syncResults = {
      tickets: { synced: 0, orphaned: 0, repaired: 0 },
      guilds: { validated: 0, fixed: 0 },
      services: { initialized: 0, failed: 0 }
    };
  }

  /**
   * Perform all startup checks
   * @param {Client} client - Discord client
   */
  async performStartupChecks(client) {
    logger.info('🔍 Performing startup health checks...');
    
    try {
      await this.checkDatabaseHealth();
      await this.checkDiscordConnection(client);
      await this.synchronizeTickets(client);
      await this.validateGuildConfigs(client);
      await this.verifyBotPermissions(client);
      await this.initializeServices();
      await this.cleanupOrphanedData();
      
      logger.info('✅ All startup checks passed!');
      logger.info(`Sync Results:`, this.syncResults);
      
      return { success: true, results: this.syncResults };
    } catch (error) {
      logger.error('❌ Startup checks failed:', error);
      return { success: false, error };
    }
  }

  /**
   * Check database health
   */
  async checkDatabaseHealth() {
    logger.info('Checking database health...');
    
    try {
      // Test database connection
      const mongoose = await import('mongoose');
      if (mongoose.default.connection.readyState !== 1) {
        throw new Error('Database not connected');
      }
      
      // Test basic query
      await Ticket.countDocuments();
      
      logger.info('✅ Database health check passed');
    } catch (error) {
      logger.error('❌ Database health check failed:', error);
      throw error;
    }
  }

  /**
   * Check Discord connection
   * @param {Client} client - Discord client
   */
  async checkDiscordConnection(client) {
    logger.info('Checking Discord connection...');
    
    try {
      if (!client.isReady()) {
        throw new Error('Client not ready');
      }
      
      // Test API call
      await client.guilds.fetch().catch(() => {});
      
      logger.info(`✅ Discord connection healthy (${client.guilds.cache.size} guilds)`);
    } catch (error) {
      logger.error('❌ Discord connection check failed:', error);
      throw error;
    }
  }

  /**
   * Synchronize tickets with actual channels
   * @param {Client} client - Discord client
   */
  async synchronizeTickets(client) {
    logger.info('Synchronizing tickets...');
    
    try {
      const tickets = await Ticket.find({ status: { $in: ['open', 'claimed'] } });
      
      for (const ticket of tickets) {
        try {
          const guild = await client.guilds.fetch(ticket.guildId).catch(() => null);
          
          if (!guild) {
            // Guild no longer accessible
            ticket.status = 'closed';
            ticket.closedAt = new Date();
            ticket.closingNote = 'Auto-closed: Bot removed from server';
            await ticket.save();
            this.syncResults.tickets.orphaned++;
            continue;
          }
          
          const channel = await guild.channels.fetch(ticket.channelId).catch(() => null);
          
          if (!channel) {
            // Channel deleted but ticket still open
            ticket.status = 'closed';
            ticket.closedAt = new Date();
            ticket.closingNote = 'Auto-closed: Channel no longer exists';
            await ticket.save();
            this.syncResults.tickets.orphaned++;
            logger.debug(`Closed orphaned ticket: ${ticket.ticketId}`);
          } else {
            // Verify and repair if needed
            await this.repairTicketIfNeeded(ticket, channel, guild);
            this.syncResults.tickets.synced++;
          }
        } catch (error) {
          logger.error(`Error syncing ticket ${ticket.ticketId}:`, error);
        }
      }
      
      logger.info(`✅ Ticket synchronization complete: ${this.syncResults.tickets.synced} synced, ${this.syncResults.tickets.orphaned} orphaned, ${this.syncResults.tickets.repaired} repaired`);
    } catch (error) {
      logger.error('❌ Ticket synchronization failed:', error);
      throw error;
    }
  }

  /**
   * Repair ticket if needed
   * @param {Ticket} ticket - Ticket document
   * @param {Channel} channel - Discord channel
   * @param {Guild} guild - Discord guild
   */
  async repairTicketIfNeeded(ticket, channel, guild) {
    try {
      const guildConfig = await GuildConfig.getConfig(guild.id);
      let repaired = false;
      
      // Check if user still has access
      const user = await guild.members.fetch(ticket.userId).catch(() => null);
      if (user && !channel.permissionOverwrites.cache.has(user.id)) {
        await channel.permissionOverwrites.create(user.id, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true
        });
        repaired = true;
      }
      
      // Check if staff role has access
      if (guildConfig.staffRoleId && !channel.permissionOverwrites.cache.has(guildConfig.staffRoleId)) {
        await channel.permissionOverwrites.create(guildConfig.staffRoleId, {
          ViewChannel: true,
          SendMessages: true,
          ManageMessages: true,
          ReadMessageHistory: true
        });
        repaired = true;
      }
      
      if (repaired) {
        this.syncResults.tickets.repaired++;
        logger.debug(`Repaired ticket: ${ticket.ticketId}`);
      }
    } catch (error) {
      logger.error(`Error repairing ticket ${ticket.ticketId}:`, error);
    }
  }

  /**
   * Validate guild configurations
   * @param {Client} client - Discord client
   */
  async validateGuildConfigs(client) {
    logger.info('Validating guild configurations...');
    
    try {
      const guilds = client.guilds.cache;
      
      for (const [guildId, guild] of guilds) {
        try {
          let config = await GuildConfig.getConfig(guildId);
          let fixed = false;
          
          // Validate channel IDs
          const channelIds = [
            config.ticketCategoryId,
            config.ticketPanelChannelId,
            config.transcriptLogChannelId,
            config.modmailLogChannelId,
            config.autoMod?.logChannelId
          ].filter(Boolean);
          
          for (const channelId of channelIds) {
            const channel = await guild.channels.fetch(channelId).catch(() => null);
            if (!channel) {
              // Channel no longer exists, clear from config
              if (config.ticketCategoryId === channelId) config.ticketCategoryId = null;
              if (config.ticketPanelChannelId === channelId) config.ticketPanelChannelId = null;
              if (config.transcriptLogChannelId === channelId) config.transcriptLogChannelId = null;
              if (config.modmailLogChannelId === channelId) config.modmailLogChannelId = null;
              fixed = true;
            }
          }
          
          // Validate role IDs
          const roleIds = [
            config.staffRoleId,
            config.adminRoleId,
            ...(config.autoMod?.exemptRoles || [])
          ].filter(Boolean);
          
          for (const roleId of roleIds) {
            const role = await guild.roles.fetch(roleId).catch(() => null);
            if (!role) {
              // Role no longer exists
              if (config.staffRoleId === roleId) config.staffRoleId = null;
              if (config.adminRoleId === roleId) config.adminRoleId = null;
              fixed = true;
            }
          }
          
          if (fixed) {
            await config.save();
            this.syncResults.guilds.fixed++;
          }
          
          this.syncResults.guilds.validated++;
        } catch (error) {
          logger.error(`Error validating config for guild ${guildId}:`, error);
        }
      }
      
      logger.info(`✅ Guild configuration validation complete: ${this.syncResults.guilds.validated} validated, ${this.syncResults.guilds.fixed} fixed`);
    } catch (error) {
      logger.error('❌ Guild configuration validation failed:', error);
      throw error;
    }
  }

  /**
   * Verify bot permissions
   * @param {Client} client - Discord client
   */
  async verifyBotPermissions(client) {
    logger.info('Verifying bot permissions...');
    
    try {
      const requiredPermissions = [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageRoles,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.ModerateMembers
      ];
      
      const guilds = client.guilds.cache;
      let missingPerms = 0;
      
      for (const [guildId, guild] of guilds) {
        try {
          const botMember = await guild.members.fetchMe();
          const permissions = botMember.permissions;
          
          const missing = requiredPermissions.filter(perm => !permissions.has(perm));
          
          if (missing.length > 0) {
            logger.warn(`Missing permissions in ${guild.name}:`, missing);
            missingPerms++;
          }
        } catch (error) {
          logger.error(`Error checking permissions in guild ${guildId}:`, error);
        }
      }
      
      if (missingPerms > 0) {
        logger.warn(`⚠️ Bot missing permissions in ${missingPerms} guilds`);
      } else {
        logger.info('✅ Bot has all required permissions');
      }
    } catch (error) {
      logger.error('❌ Permission verification failed:', error);
      throw error;
    }
  }

  /**
   * Initialize services
   */
  async initializeServices() {
    logger.info('Initializing services...');
    
    try {
      const services = [
        'AutoModService',
        'NukeDetector',
        'HealthMonitor',
        'BrandingService'
      ];
      
      for (const serviceName of services) {
        try {
          const service = await import(`./${serviceName}.js`);
          if (service.default && typeof service.default.initialize === 'function') {
            await service.default.initialize();
          }
          this.syncResults.services.initialized++;
        } catch (error) {
          logger.error(`Failed to initialize ${serviceName}:`, error);
          this.syncResults.services.failed++;
        }
      }
      
      logger.info(`✅ Services initialized: ${this.syncResults.services.initialized} success, ${this.syncResults.services.failed} failed`);
    } catch (error) {
      logger.error('❌ Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Cleanup orphaned data
   */
  async cleanupOrphanedData() {
    logger.info('Cleaning up orphaned data...');
    
    try {
      // Clean up very old closed tickets (older than 90 days)
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const result = await Ticket.deleteMany({
        status: 'closed',
        closedAt: { $lt: ninetyDaysAgo }
      });
      
      if (result.deletedCount > 0) {
        logger.info(`Cleaned up ${result.deletedCount} old tickets`);
      }
      
      logger.info('✅ Orphaned data cleanup complete');
    } catch (error) {
      logger.error('❌ Orphaned data cleanup failed:', error);
      // Don't throw, this is not critical
    }
  }
}

// Export singleton instance
export default new StartupService();

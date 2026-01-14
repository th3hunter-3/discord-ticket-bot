/**
 * Nuke Detector Service
 * Detects and prevents mass channel/role deletion, ban waves, and raids
 */

import logger from '../utils/logger.js';
import { EmbedBuilder } from 'discord.js';

class NukeDetector {
  constructor() {
    // Track actions per guild
    this.guildActions = new Map();
    
    // Thresholds for nuke detection
    this.thresholds = {
      channelDelete: { count: 3, window: 10000 }, // 3 channels in 10s
      roleDelete: { count: 3, window: 10000 },
      memberBan: { count: 5, window: 10000 },
      memberKick: { count: 10, window: 10000 },
      channelCreate: { count: 5, window: 10000 },
      roleCreate: { count: 5, window: 10000 }
    };
  }

  /**
   * Track an action
   * @param {string} guildId - Guild ID
   * @param {string} actionType - Type of action
   * @param {string} userId - User who performed action
   * @returns {Object} Detection result
   */
  trackAction(guildId, actionType, userId) {
    if (!this.guildActions.has(guildId)) {
      this.guildActions.set(guildId, new Map());
    }

    const actions = this.guildActions.get(guildId);
    if (!actions.has(actionType)) {
      actions.set(actionType, []);
    }

    const actionList = actions.get(actionType);
    const now = Date.now();
    
    // Add current action
    actionList.push({ timestamp: now, userId });

    // Clean old actions
    const threshold = this.thresholds[actionType];
    if (threshold) {
      const validActions = actionList.filter(a => now - a.timestamp < threshold.window);
      actions.set(actionType, validActions);

      // Check if threshold exceeded
      if (validActions.length >= threshold.count) {
        logger.warn(`Nuke detected in guild ${guildId}: ${actionType} - ${validActions.length} actions in ${threshold.window}ms`);
        
        return {
          detected: true,
          actionType,
          count: validActions.length,
          threshold: threshold.count,
          suspectUserId: userId,
          actions: validActions
        };
      }
    }

    return { detected: false };
  }

  /**
   * Execute anti-nuke actions
   * @param {Guild} guild - Discord guild
   * @param {Object} detection - Detection result
   * @param {Object} config - Guild config
   */
  async executeAntiNuke(guild, detection, config) {
    try {
      const { suspectUserId, actionType } = detection;

      // Try to remove permissions from suspect
      if (config.antiNuke?.autoRevoke) {
        try {
          const member = await guild.members.fetch(suspectUserId);
          
          // Remove admin permissions
          if (member.permissions.has('Administrator')) {
            const roles = member.roles.cache.filter(role => 
              role.permissions.has('Administrator') && 
              role.name !== '@everyone'
            );

            for (const role of roles.values()) {
              await member.roles.remove(role, 'Anti-nuke: Suspicious mass actions detected');
              logger.info(`Removed role ${role.name} from ${member.user.tag} due to nuke detection`);
            }
          }

          // Remove dangerous permissions
          const dangerousPerms = ['ManageChannels', 'ManageRoles', 'BanMembers', 'KickMembers'];
          const memberRoles = member.roles.cache.filter(role => {
            return dangerousPerms.some(perm => role.permissions.has(perm));
          });

          for (const role of memberRoles.values()) {
            if (role.name !== '@everyone') {
              await member.roles.remove(role, 'Anti-nuke: Preventive measure');
            }
          }

        } catch (error) {
          logger.error('Failed to revoke permissions from suspect:', error);
        }
      }

      // Enable lockdown mode
      if (config.antiNuke?.autoLockdown) {
        const GuildConfig = (await import('../models/GuildConfig.js')).default;
        const guildConfig = await GuildConfig.getConfig(guild.id);
        guildConfig.lockdownMode = true;
        guildConfig.lockdownReason = `Auto-lockdown: ${actionType} nuke detected`;
        await guildConfig.save();
        logger.info(`Auto-lockdown enabled for guild ${guild.name}`);
      }

      // Send alert to log channel
      if (config.antiNuke?.logChannelId) {
        try {
          const logChannel = await guild.channels.fetch(config.antiNuke.logChannelId);
          
          const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('🚨 NUKE DETECTED')
            .setDescription(`Suspicious mass ${actionType} detected!`)
            .addFields(
              { name: 'Suspect User', value: `<@${suspectUserId}>`, inline: true },
              { name: 'Action Type', value: actionType, inline: true },
              { name: 'Count', value: `${detection.count}/${detection.threshold}`, inline: true },
              { name: 'Actions Taken', value: [
                config.antiNuke?.autoRevoke ? '✅ Permissions revoked' : '❌ Auto-revoke disabled',
                config.antiNuke?.autoLockdown ? '✅ Lockdown enabled' : '❌ Auto-lockdown disabled'
              ].join('\n') }
            )
            .setTimestamp();

          await logChannel.send({ embeds: [embed] });
        } catch (error) {
          logger.error('Failed to send nuke alert:', error);
        }
      }

    } catch (error) {
      logger.error('Error executing anti-nuke actions:', error);
    }
  }

  /**
   * Reset tracking for a guild
   * @param {string} guildId - Guild ID
   */
  reset(guildId) {
    this.guildActions.delete(guildId);
    logger.info(`Nuke detector reset for guild ${guildId}`);
  }

  /**
   * Get statistics for a guild
   * @param {string} guildId - Guild ID
   * @returns {Object} Statistics
   */
  getStats(guildId) {
    const actions = this.guildActions.get(guildId);
    if (!actions) {
      return {};
    }

    const stats = {};
    for (const [actionType, actionList] of actions.entries()) {
      stats[actionType] = actionList.length;
    }

    return stats;
  }

  /**
   * Cleanup old data periodically
   */
  cleanup() {
    const now = Date.now();
    
    for (const [guildId, actions] of this.guildActions.entries()) {
      for (const [actionType, actionList] of actions.entries()) {
        const threshold = this.thresholds[actionType];
        if (threshold) {
          const validActions = actionList.filter(a => now - a.timestamp < threshold.window);
          
          if (validActions.length === 0) {
            actions.delete(actionType);
          } else {
            actions.set(actionType, validActions);
          }
        }
      }

      if (actions.size === 0) {
        this.guildActions.delete(guildId);
      }
    }
  }
}

// Export singleton instance
export default new NukeDetector();

// Run cleanup every minute
setInterval(() => {
  try {
    const detector = (await import('./NukeDetector.js')).default;
    detector.cleanup();
  } catch (error) {
    logger.error('Nuke detector cleanup error:', error);
  }
}, 60000);

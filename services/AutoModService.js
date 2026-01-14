/**
 * Auto Moderation Service
 * Smart content filtering, spam detection, and automated moderation
 */

import logger from '../utils/logger.js';
import { EmbedBuilder } from 'discord.js';

class AutoModService {
  constructor() {
    // Spam tracking
    this.messageTracking = new Map();
    
    // Default filters
    this.filters = {
      invites: {
        enabled: true,
        pattern: /discord\.gg\/[a-zA-Z0-9]+|discord\.com\/invite\/[a-zA-Z0-9]+/gi,
        action: 'delete',
        exemptRoles: []
      },
      links: {
        enabled: false,
        pattern: /(https?:\/\/[^\s]+)/gi,
        action: 'delete',
        whitelist: [],
        exemptRoles: []
      },
      mentions: {
        enabled: true,
        maxMentions: 5,
        action: 'warn',
        exemptRoles: []
      },
      spam: {
        enabled: true,
        maxMessages: 5,
        timeWindow: 5000,
        action: 'timeout',
        duration: 300000, // 5 minutes
        exemptRoles: []
      },
      caps: {
        enabled: true,
        threshold: 0.7, // 70% caps
        minLength: 10,
        action: 'warn',
        exemptRoles: []
      },
      badWords: {
        enabled: true,
        words: ['badword1', 'badword2'], // Placeholder
        action: 'delete',
        exemptRoles: []
      },
      zalgo: {
        enabled: true,
        threshold: 0.5,
        action: 'delete',
        exemptRoles: []
      }
    };
  }

  /**
   * Check message against all filters
   * @param {Message} message - Discord message
   * @param {Object} guildConfig - Guild configuration
   * @returns {Promise<Object>} Moderation result
   */
  async checkMessage(message, guildConfig) {
    if (message.author.bot) return { pass: true };

    const violations = [];
    const member = message.member;

    // Check if user has exempt roles
    const exemptRoles = guildConfig.autoMod?.exemptRoles || [];
    const hasExemption = exemptRoles.some(roleId => member.roles.cache.has(roleId));
    
    if (hasExemption) return { pass: true };

    // Check each filter
    if (guildConfig.autoMod?.filters?.invites?.enabled) {
      const inviteCheck = this.checkInvites(message);
      if (!inviteCheck.pass) violations.push(inviteCheck);
    }

    if (guildConfig.autoMod?.filters?.links?.enabled) {
      const linkCheck = this.checkLinks(message, guildConfig.autoMod.filters.links);
      if (!linkCheck.pass) violations.push(linkCheck);
    }

    if (guildConfig.autoMod?.filters?.mentions?.enabled) {
      const mentionCheck = this.checkMentions(message, guildConfig.autoMod.filters.mentions);
      if (!mentionCheck.pass) violations.push(mentionCheck);
    }

    if (guildConfig.autoMod?.filters?.spam?.enabled) {
      const spamCheck = this.checkSpam(message, guildConfig.autoMod.filters.spam);
      if (!spamCheck.pass) violations.push(spamCheck);
    }

    if (guildConfig.autoMod?.filters?.caps?.enabled) {
      const capsCheck = this.checkCaps(message, guildConfig.autoMod.filters.caps);
      if (!capsCheck.pass) violations.push(capsCheck);
    }

    if (guildConfig.autoMod?.filters?.badWords?.enabled) {
      const badWordCheck = this.checkBadWords(message, guildConfig.autoMod.filters.badWords);
      if (!badWordCheck.pass) violations.push(badWordCheck);
    }

    if (guildConfig.autoMod?.filters?.zalgo?.enabled) {
      const zalgoCheck = this.checkZalgo(message, guildConfig.autoMod.filters.zalgo);
      if (!zalgoCheck.pass) violations.push(zalgoCheck);
    }

    if (violations.length > 0) {
      return {
        pass: false,
        violations,
        action: this.determineAction(violations)
      };
    }

    return { pass: true };
  }

  /**
   * Check for Discord invites
   */
  checkInvites(message) {
    const invitePattern = /discord\.gg\/[a-zA-Z0-9]+|discord\.com\/invite\/[a-zA-Z0-9]+/gi;
    
    if (invitePattern.test(message.content)) {
      return {
        pass: false,
        type: 'invite',
        reason: 'Discord invite link detected',
        action: 'delete'
      };
    }

    return { pass: true };
  }

  /**
   * Check for suspicious links
   */
  checkLinks(message, config) {
    const linkPattern = /(https?:\/\/[^\s]+)/gi;
    const links = message.content.match(linkPattern);

    if (links) {
      const whitelist = config.whitelist || [];
      const suspicious = links.some(link => {
        return !whitelist.some(allowed => link.includes(allowed));
      });

      if (suspicious) {
        return {
          pass: false,
          type: 'link',
          reason: 'Unauthorized link detected',
          action: config.action || 'delete'
        };
      }
    }

    return { pass: true };
  }

  /**
   * Check for mention spam
   */
  checkMentions(message, config) {
    const mentions = message.mentions.users.size + message.mentions.roles.size;
    const maxMentions = config.maxMentions || 5;

    if (mentions > maxMentions) {
      return {
        pass: false,
        type: 'mentions',
        reason: `Too many mentions (${mentions}/${maxMentions})`,
        action: config.action || 'warn'
      };
    }

    return { pass: true };
  }

  /**
   * Check for spam
   */
  checkSpam(message, config) {
    const userId = message.author.id;
    const now = Date.now();

    if (!this.messageTracking.has(userId)) {
      this.messageTracking.set(userId, []);
    }

    const messages = this.messageTracking.get(userId);
    messages.push(now);

    // Clean old messages
    const timeWindow = config.timeWindow || 5000;
    const recentMessages = messages.filter(timestamp => now - timestamp < timeWindow);
    this.messageTracking.set(userId, recentMessages);

    const maxMessages = config.maxMessages || 5;
    if (recentMessages.length > maxMessages) {
      return {
        pass: false,
        type: 'spam',
        reason: `Sending messages too quickly (${recentMessages.length} messages in ${timeWindow}ms)`,
        action: config.action || 'timeout',
        duration: config.duration || 300000
      };
    }

    return { pass: true };
  }

  /**
   * Check for excessive caps
   */
  checkCaps(message, config) {
    const content = message.content;
    const minLength = config.minLength || 10;

    if (content.length < minLength) return { pass: true };

    const caps = content.replace(/[^A-Z]/g, '').length;
    const total = content.replace(/[^A-Za-z]/g, '').length;

    if (total === 0) return { pass: true };

    const ratio = caps / total;
    const threshold = config.threshold || 0.7;

    if (ratio > threshold) {
      return {
        pass: false,
        type: 'caps',
        reason: `Excessive caps (${Math.round(ratio * 100)}%)`,
        action: config.action || 'warn'
      };
    }

    return { pass: true };
  }

  /**
   * Check for bad words
   */
  checkBadWords(message, config) {
    const content = message.content.toLowerCase();
    const words = config.words || [];

    for (const word of words) {
      if (content.includes(word.toLowerCase())) {
        return {
          pass: false,
          type: 'badword',
          reason: 'Inappropriate language detected',
          action: config.action || 'delete'
        };
      }
    }

    return { pass: true };
  }

  /**
   * Check for zalgo text
   */
  checkZalgo(message, config) {
    const content = message.content;
    const zalgoPattern = /[\u0300-\u036F\u0489]/g;
    const zalgoChars = (content.match(zalgoPattern) || []).length;
    const totalChars = content.length;

    if (totalChars === 0) return { pass: true };

    const ratio = zalgoChars / totalChars;
    const threshold = config.threshold || 0.5;

    if (ratio > threshold) {
      return {
        pass: false,
        type: 'zalgo',
        reason: 'Zalgo/combining characters detected',
        action: config.action || 'delete'
      };
    }

    return { pass: true };
  }

  /**
   * Determine the most severe action
   */
  determineAction(violations) {
    const actionPriority = ['ban', 'timeout', 'delete', 'warn'];
    
    for (const action of actionPriority) {
      if (violations.some(v => v.action === action)) {
        return action;
      }
    }

    return 'warn';
  }

  /**
   * Execute moderation action
   * @param {Message} message - Discord message
   * @param {Object} result - Moderation result
   * @param {Object} guildConfig - Guild configuration
   */
  async executeAction(message, result, guildConfig) {
    try {
      const { action, violations, duration } = result;

      // Delete message if needed
      if (['delete', 'timeout', 'ban'].includes(action)) {
        await message.delete().catch(() => {});
      }

      // Execute action
      switch (action) {
        case 'warn':
          await this.warnUser(message, violations);
          break;
        case 'timeout':
          await this.timeoutUser(message, duration || 300000, violations);
          break;
        case 'ban':
          await this.banUser(message, violations);
          break;
      }

      // Log action
      await this.logAction(message, result, guildConfig);

    } catch (error) {
      logger.error('Error executing auto-mod action:', error);
    }
  }

  /**
   * Warn user
   */
  async warnUser(message, violations) {
    try {
      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ Auto-Moderation Warning')
        .setDescription('Your message violated server rules.')
        .addFields({
          name: 'Violations',
          value: violations.map(v => `• ${v.reason}`).join('\n')
        });

      await message.author.send({ embeds: [embed] }).catch(() => {});
    } catch (error) {
      logger.error('Error warning user:', error);
    }
  }

  /**
   * Timeout user
   */
  async timeoutUser(message, duration, violations) {
    try {
      await message.member.timeout(duration, 'Auto-mod: ' + violations[0].reason);
      
      const embed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('⏱️ Timeout Applied')
        .setDescription(`You have been timed out for ${Math.round(duration / 1000 / 60)} minutes.`)
        .addFields({
          name: 'Reason',
          value: violations.map(v => `• ${v.reason}`).join('\n')
        });

      await message.author.send({ embeds: [embed] }).catch(() => {});
    } catch (error) {
      logger.error('Error timing out user:', error);
    }
  }

  /**
   * Ban user
   */
  async banUser(message, violations) {
    try {
      await message.member.ban({ reason: 'Auto-mod: ' + violations[0].reason });
    } catch (error) {
      logger.error('Error banning user:', error);
    }
  }

  /**
   * Log moderation action
   */
  async logAction(message, result, guildConfig) {
    try {
      if (!guildConfig.autoMod?.logChannelId) return;

      const logChannel = await message.guild.channels.fetch(guildConfig.autoMod.logChannelId);
      
      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('🤖 Auto-Moderation Action')
        .addFields(
          { name: 'User', value: `${message.author.tag} (${message.author.id})`, inline: true },
          { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
          { name: 'Action', value: result.action, inline: true },
          { name: 'Violations', value: result.violations.map(v => `• ${v.type}: ${v.reason}`).join('\n') }
        )
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      logger.error('Error logging auto-mod action:', error);
    }
  }

  /**
   * Cleanup old tracking data
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 60000; // 1 minute

    for (const [userId, messages] of this.messageTracking.entries()) {
      const recentMessages = messages.filter(timestamp => now - timestamp < maxAge);
      
      if (recentMessages.length === 0) {
        this.messageTracking.delete(userId);
      } else {
        this.messageTracking.set(userId, recentMessages);
      }
    }
  }
}

// Export singleton instance
export default new AutoModService();

// Run cleanup every 30 seconds
setInterval(async () => {
  try {
    const autoMod = (await import('./AutoModService.js')).default;
    autoMod.cleanup();
  } catch (error) {
    logger.error('Auto-mod cleanup error:', error);
  }
}, 30000);

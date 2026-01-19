/**
 * Permission Validator Middleware
 * 
 * Provides strict permission validation and enforcement:
 * - Role hierarchy validation
 * - Permission escalation prevention
 * - Audit logging for sensitive actions
 * - Staff restrictions (prevent accidental/malicious actions)
 * - Admin safeguards
 */

import logger from '../utils/logger.js';

class PermissionValidator {
  constructor() {
    // Audit log: Map<userId, Array<{action, timestamp, details}>>
    this.auditLog = new Map();
    
    // Staff-restricted actions
    this.staffRestrictions = [
      'setup',
      'panel',
      'automod',
      'lockdown',
      'force-close',
      'delete-all-tickets',
      'close-all',
      'maintenance',
      'force-sync',
      'stats',
      'eval',
      'restart',
      'reload-commands',
      'whitelist'
    ];
    
    // Admin-restricted actions (owner only)
    this.ownerOnlyCommands = [
      'delete-all-tickets',
      'maintenance',
      'force-sync',
      'eval',
      'restart',
      'reload-commands',
      'whitelist',
      'health',
      'stats',
      'close-all'
    ];
    
    // Dangerous actions requiring confirmation
    this.dangerousActions = [
      'delete-all-tickets',
      'close-all',
      'force-close'
    ];
    
    logger.info('Permission Validator initialized');
  }
  
  /**
   * Get user access level
   * @param {GuildMember} member - Guild member
   * @param {GuildConfig} guildConfig - Guild configuration
   * @returns {string} - Access level: 'owner', 'admin', 'staff', or 'user'
   */
  getUserLevel(member, guildConfig) {
    // Check owner
    const ownerIds = process.env.OWNER_IDS?.split(',') || [];
    if (ownerIds.includes(member.id)) {
      return 'owner';
    }
    
    // Check admin role
    if (guildConfig?.adminRoleId && member.roles.cache.has(guildConfig.adminRoleId)) {
      return 'admin';
    }
    
    // Check staff role
    if (guildConfig?.staffRoleId && member.roles.cache.has(guildConfig.staffRoleId)) {
      return 'staff';
    }
    
    // Check guild owner
    if (member.guild.ownerId === member.id) {
      return 'admin'; // Guild owners are treated as admins
    }
    
    return 'user';
  }
  
  /**
   * Validate permission for command
   * @param {Interaction} interaction - Discord interaction
   * @param {GuildConfig} guildConfig - Guild configuration
   * @returns {Object} - { allowed: boolean, reason: string, level: string }
   */
  validateCommand(interaction, guildConfig) {
    const member = interaction.member;
    const commandName = interaction.commandName;
    const userLevel = this.getUserLevel(member, guildConfig);
    
    // Owner can do everything
    if (userLevel === 'owner') {
      this.logAction(interaction.user.id, `command:${commandName}`, {
        level: 'owner',
        guild: interaction.guildId
      });
      return { allowed: true, level: userLevel };
    }
    
    // Check owner-only commands
    if (this.ownerOnlyCommands.includes(commandName)) {
      logger.warn(`User ${member.id} (${userLevel}) attempted owner-only command: ${commandName}`);
      return {
        allowed: false,
        reason: '❌ This command is restricted to bot owners only.',
        level: userLevel
      };
    }
    
    // Check staff restrictions
    if (userLevel === 'staff' && this.staffRestrictions.includes(commandName)) {
      logger.warn(`Staff ${member.id} attempted restricted command: ${commandName}`);
      return {
        allowed: false,
        reason: '❌ This command requires administrator permissions.',
        level: userLevel
      };
    }
    
    // Log action
    this.logAction(interaction.user.id, `command:${commandName}`, {
      level: userLevel,
      guild: interaction.guildId,
      dangerous: this.dangerousActions.includes(commandName)
    });
    
    return { allowed: true, level: userLevel };
  }
  
  /**
   * Check if action requires confirmation
   * @param {string} commandName - Command name
   * @returns {boolean} - Whether confirmation is required
   */
  requiresConfirmation(commandName) {
    return this.dangerousActions.includes(commandName);
  }
  
  /**
   * Validate configuration change permission
   * @param {GuildMember} member - Guild member
   * @param {GuildConfig} guildConfig - Guild configuration
   * @param {string} setting - Setting being changed
   * @returns {Object} - { allowed: boolean, reason: string }
   */
  validateConfigChange(member, guildConfig, setting) {
    const userLevel = this.getUserLevel(member, guildConfig);
    
    // Only admins and owners can change configuration
    if (userLevel === 'staff' || userLevel === 'user') {
      logger.warn(`User ${member.id} (${userLevel}) attempted to change config: ${setting}`);
      return {
        allowed: false,
        reason: '❌ Only administrators can modify bot configuration.'
      };
    }
    
    // Critical settings require owner permission
    const criticalSettings = ['rateLimitMax', 'rateLimitWindow', 'maxOpenTickets', 'antiNuke', 'whitelisted'];
    if (criticalSettings.includes(setting) && userLevel !== 'owner') {
      logger.warn(`Admin ${member.id} attempted to change critical setting: ${setting}`);
      return {
        allowed: false,
        reason: '❌ This setting can only be modified by bot owners.'
      };
    }
    
    this.logAction(member.id, `config:${setting}`, {
      level: userLevel,
      guild: member.guild.id
    });
    
    return { allowed: true };
  }
  
  /**
   * Log action to audit log
   * @param {string} userId - User ID
   * @param {string} action - Action performed
   * @param {Object} details - Additional details
   */
  logAction(userId, action, details = {}) {
    let userLog = this.auditLog.get(userId);
    
    if (!userLog) {
      userLog = [];
    }
    
    userLog.push({
      action,
      timestamp: new Date(),
      ...details
    });
    
    // Keep last 100 actions per user
    if (userLog.length > 100) {
      userLog.shift();
    }
    
    this.auditLog.set(userId, userLog);
    
    // Log dangerous actions to Winston
    if (details.dangerous) {
      logger.warn(`AUDIT: User ${userId} (${details.level}) performed dangerous action: ${action} in guild ${details.guild}`);
    }
  }
  
  /**
   * Get audit log for user
   * @param {string} userId - User ID
   * @param {number} limit - Number of entries to return
   * @returns {Array} - Audit log entries
   */
  getAuditLog(userId, limit = 10) {
    const userLog = this.auditLog.get(userId) || [];
    return userLog.slice(-limit);
  }
  
  /**
   * Get full audit log statistics
   * @returns {Object} - Statistics object
   */
  getAuditStats() {
    let totalActions = 0;
    let dangerousActions = 0;
    let usersByLevel = { owner: 0, admin: 0, staff: 0, user: 0 };
    
    for (const userLog of this.auditLog.values()) {
      totalActions += userLog.length;
      for (const entry of userLog) {
        if (entry.dangerous) dangerousActions++;
        if (entry.level) {
          usersByLevel[entry.level] = (usersByLevel[entry.level] || 0) + 1;
        }
      }
    }
    
    return {
      totalUsers: this.auditLog.size,
      totalActions,
      dangerousActions,
      usersByLevel
    };
  }
  
  /**
   * Cleanup old audit log entries
   */
  cleanup() {
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    const now = Date.now();
    let cleaned = 0;
    
    for (const [userId, userLog] of this.auditLog.entries()) {
      const filtered = userLog.filter(entry => {
        return (now - entry.timestamp.getTime()) < maxAge;
      });
      
      if (filtered.length === 0) {
        this.auditLog.delete(userId);
        cleaned++;
      } else if (filtered.length !== userLog.length) {
        this.auditLog.set(userId, filtered);
      }
    }
    
    if (cleaned > 0) {
      logger.debug(`Permission validator cleanup: ${cleaned} user logs removed`);
    }
    
    // Size limit enforcement
    if (this.auditLog.size > 10000) {
      const entries = Array.from(this.auditLog.entries());
      this.auditLog.clear();
      // Keep most recent 5000
      for (let i = entries.length - 5000; i < entries.length; i++) {
        this.auditLog.set(entries[i][0], entries[i][1]);
      }
      logger.warn('Permission validator: Audit log size limit enforced');
    }
  }
}

// Export singleton instance
const permissionValidator = new PermissionValidator();

// Cleanup interval
setInterval(() => {
  permissionValidator.cleanup();
}, 3600000); // 1 hour

export default permissionValidator;

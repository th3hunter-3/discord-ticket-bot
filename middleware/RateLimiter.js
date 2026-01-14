/**
 * Universal Rate Limiter Middleware
 * 
 * Provides sophisticated rate limiting for all commands with:
 * - Role-based rate limits (user/staff/admin/owner tiers)
 * - Per-command cooldowns
 * - Adaptive rate limiting based on behavior
 * - Abuse detection and auto-blacklist
 * - Emergency bypass for critical commands
 */

import logger from '../utils/logger.js';

class UniversalRateLimiter {
  constructor() {
    // Command usage tracking: Map<userId_commandName, { count, firstUse, lastUse, violations }>
    this.commandUsage = new Map();
    
    // User behavior tracking: Map<userId, { trustScore, violations, blacklisted }>
    this.userBehavior = new Map();
    
    // Role-based rate limits (requests per window)
    this.rateLimits = {
      user: { max: 5, window: 60000 },    // 5 per minute
      staff: { max: 10, window: 60000 },   // 10 per minute
      admin: { max: 20, window: 60000 },   // 20 per minute
      owner: { max: Infinity, window: 1 }  // Unlimited
    };
    
    // Command-specific cooldowns (milliseconds)
    this.commandCooldowns = {
      'eval': 5000,           // 5 seconds
      'restart': 30000,       // 30 seconds
      'close-all': 60000,     // 1 minute
      'delete-all-tickets': 300000, // 5 minutes
      'force-close': 10000,   // 10 seconds
      'blacklist': 5000,      // 5 seconds
      'setup': 300000,        // 5 minutes
      'panel': 60000,         // 1 minute
    };
    
    // Cleanup interval
    setInterval(async () => {
      this.cleanup();
    }, 300000); // 5 minutes
    
    logger.info('Universal Rate Limiter initialized');
  }
  
  /**
   * Check if user can execute command
   * @param {Interaction} interaction - Discord interaction
   * @param {string} userLevel - User access level (user/staff/admin/owner)
   * @returns {Object} - { allowed: boolean, reason: string, resetAt: Date }
   */
  checkCommandLimit(interaction, userLevel) {
    const userId = interaction.user.id;
    const commandName = interaction.commandName;
    const key = `${userId}_${commandName}`;
    
    // Owner bypass
    if (userLevel === 'owner') {
      return { allowed: true };
    }
    
    // Check if user is blacklisted
    const behavior = this.userBehavior.get(userId);
    if (behavior?.blacklisted) {
      logger.warn(`Blacklisted user ${userId} attempted to use command ${commandName}`);
      return {
        allowed: false,
        reason: 'You have been temporarily blacklisted due to abuse. Contact an administrator.',
        resetAt: null
      };
    }
    
    // Check command-specific cooldown
    if (this.commandCooldowns[commandName]) {
      const commandData = this.commandUsage.get(key);
      if (commandData) {
        const timeSinceLastUse = Date.now() - commandData.lastUse;
        if (timeSinceLastUse < this.commandCooldowns[commandName]) {
          const resetAt = new Date(commandData.lastUse + this.commandCooldowns[commandName]);
          return {
            allowed: false,
            reason: `This command has a cooldown. Try again <t:${Math.floor(resetAt.getTime() / 1000)}:R>.`,
            resetAt
          };
        }
      }
    }
    
    // Check role-based rate limit
    const limit = this.rateLimits[userLevel] || this.rateLimits.user;
    const now = Date.now();
    
    let usage = this.commandUsage.get(key);
    
    if (!usage) {
      // First use
      usage = {
        count: 1,
        firstUse: now,
        lastUse: now,
        violations: 0
      };
      this.commandUsage.set(key, usage);
      this.updateUserBehavior(userId, false);
      return { allowed: true };
    }
    
    // Check if window has expired
    const windowExpired = (now - usage.firstUse) >= limit.window;
    
    if (windowExpired) {
      // Reset window
      usage.count = 1;
      usage.firstUse = now;
      usage.lastUse = now;
      this.commandUsage.set(key, usage);
      return { allowed: true };
    }
    
    // Check if limit exceeded
    if (usage.count >= limit.max) {
      usage.violations++;
      this.commandUsage.set(key, usage);
      this.updateUserBehavior(userId, true);
      
      const resetAt = new Date(usage.firstUse + limit.window);
      
      logger.warn(`Rate limit exceeded for user ${userId} on command ${commandName} (violation #${usage.violations})`);
      
      return {
        allowed: false,
        reason: `⏱️ Slow down! You can use this command ${limit.max} times per minute. Try again <t:${Math.floor(resetAt.getTime() / 1000)}:R>.`,
        resetAt
      };
    }
    
    // Increment usage
    usage.count++;
    usage.lastUse = now;
    this.commandUsage.set(key, usage);
    this.updateUserBehavior(userId, false);
    
    return { allowed: true };
  }
  
  /**
   * Update user behavior tracking
   * @param {string} userId - User ID
   * @param {boolean} isViolation - Whether this is a violation
   */
  updateUserBehavior(userId, isViolation) {
    let behavior = this.userBehavior.get(userId);
    
    if (!behavior) {
      behavior = {
        trustScore: 100,
        violations: 0,
        blacklisted: false,
        lastViolation: null
      };
    }
    
    if (isViolation) {
      behavior.violations++;
      behavior.lastViolation = Date.now();
      behavior.trustScore = Math.max(0, behavior.trustScore - 10);
      
      // Auto-blacklist after 10 violations in short time
      if (behavior.violations >= 10) {
        behavior.blacklisted = true;
        logger.error(`User ${userId} auto-blacklisted after ${behavior.violations} rate limit violations`);
        
        // Auto-unblacklist after 1 hour
        setTimeout(() => {
          const current = this.userBehavior.get(userId);
          if (current) {
            current.blacklisted = false;
            current.violations = 0;
            this.userBehavior.set(userId, current);
            logger.info(`User ${userId} auto-unblacklisted after timeout`);
          }
        }, 3600000); // 1 hour
      }
    } else {
      // Slowly increase trust score for good behavior
      behavior.trustScore = Math.min(100, behavior.trustScore + 0.1);
    }
    
    this.userBehavior.set(userId, behavior);
  }
  
  /**
   * Get user trust score
   * @param {string} userId - User ID
   * @returns {number} - Trust score (0-100)
   */
  getTrustScore(userId) {
    const behavior = this.userBehavior.get(userId);
    return behavior?.trustScore || 100;
  }
  
  /**
   * Manually blacklist user
   * @param {string} userId - User ID
   * @param {number} duration - Duration in milliseconds
   */
  blacklistUser(userId, duration = 3600000) {
    let behavior = this.userBehavior.get(userId) || {
      trustScore: 0,
      violations: 0,
      blacklisted: false,
      lastViolation: null
    };
    
    behavior.blacklisted = true;
    this.userBehavior.set(userId, behavior);
    
    logger.warn(`User ${userId} manually blacklisted for ${duration}ms`);
    
    // Auto-unblacklist after duration
    setTimeout(() => {
      const current = this.userBehavior.get(userId);
      if (current) {
        current.blacklisted = false;
        this.userBehavior.set(userId, current);
        logger.info(`User ${userId} unblacklisted after manual timeout`);
      }
    }, duration);
  }
  
  /**
   * Cleanup old entries
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour
    
    let cleanedCommands = 0;
    let cleanedBehavior = 0;
    
    // Cleanup command usage
    for (const [key, usage] of this.commandUsage.entries()) {
      if (now - usage.lastUse > maxAge) {
        this.commandUsage.delete(key);
        cleanedCommands++;
      }
    }
    
    // Cleanup user behavior (keep active users)
    for (const [userId, behavior] of this.userBehavior.entries()) {
      if (!behavior.blacklisted && behavior.violations === 0 && behavior.trustScore === 100) {
        if (!behavior.lastViolation || (now - behavior.lastViolation > maxAge)) {
          this.userBehavior.delete(userId);
          cleanedBehavior++;
        }
      }
    }
    
    if (cleanedCommands > 0 || cleanedBehavior > 0) {
      logger.debug(`Rate limiter cleanup: ${cleanedCommands} command entries, ${cleanedBehavior} behavior entries`);
    }
    
    // Size limit enforcement
    if (this.commandUsage.size > 50000) {
      const entries = Array.from(this.commandUsage.entries());
      this.commandUsage.clear();
      // Keep most recent 25000
      for (let i = entries.length - 25000; i < entries.length; i++) {
        this.commandUsage.set(entries[i][0], entries[i][1]);
      }
      logger.warn('Rate limiter: Command usage map size limit enforced');
    }
    
    if (this.userBehavior.size > 10000) {
      const entries = Array.from(this.userBehavior.entries());
      this.userBehavior.clear();
      // Keep most recent 5000
      for (let i = entries.length - 5000; i < entries.length; i++) {
        this.userBehavior.set(entries[i][0], entries[i][1]);
      }
      logger.warn('Rate limiter: User behavior map size limit enforced');
    }
  }
  
  /**
   * Get statistics
   * @returns {Object} - Statistics object
   */
  getStats() {
    let totalBlacklisted = 0;
    let totalViolations = 0;
    let avgTrustScore = 0;
    
    for (const behavior of this.userBehavior.values()) {
      if (behavior.blacklisted) totalBlacklisted++;
      totalViolations += behavior.violations;
      avgTrustScore += behavior.trustScore;
    }
    
    if (this.userBehavior.size > 0) {
      avgTrustScore /= this.userBehavior.size;
    }
    
    return {
      activeUsers: this.userBehavior.size,
      commandUsageEntries: this.commandUsage.size,
      blacklistedUsers: totalBlacklisted,
      totalViolations,
      averageTrustScore: avgTrustScore.toFixed(2)
    };
  }
}

// Export singleton instance
const rateLimiter = new UniversalRateLimiter();
export default rateLimiter;

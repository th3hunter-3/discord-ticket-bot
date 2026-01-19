/**
 * Rate Limiter Utility
 * Prevents spam and abuse
 */

import logger from './logger.js';

/**
 * Rate Limiter class
 */
class RateLimiter {
  constructor() {
    this.attempts = new Map();
  }

  /**
   * Check if user is rate limited
   * @param {string} userId - User ID
   * @param {number} maxAttempts - Maximum attempts allowed
   * @param {number} timeWindow - Time window in milliseconds
   * @returns {Object} { limited: boolean, remaining: number, resetAt: Date }
   */
  check(userId, maxAttempts, timeWindow) {
    const now = Date.now();
    const userAttempts = this.attempts.get(userId) || [];
    
    // Remove old attempts outside the time window
    const validAttempts = userAttempts.filter(timestamp => now - timestamp < timeWindow);
    
    if (validAttempts.length >= maxAttempts) {
      const oldestAttempt = Math.min(...validAttempts);
      const resetAt = new Date(oldestAttempt + timeWindow);
      
      logger.debug(`User ${userId} is rate limited. Reset at: ${resetAt}`);
      
      return {
        limited: true,
        remaining: 0,
        resetAt
      };
    }
    
    // Add current attempt
    validAttempts.push(now);
    this.attempts.set(userId, validAttempts);
    
    // Clean up old entries periodically
    if (this.attempts.size > 1000) {
      this.cleanup(timeWindow);
    }
    
    return {
      limited: false,
      remaining: maxAttempts - validAttempts.length,
      resetAt: null
    };
  }

  /**
   * Reset rate limit for a user
   * @param {string} userId - User ID
   */
  reset(userId) {
    this.attempts.delete(userId);
    logger.debug(`Rate limit reset for user ${userId}`);
  }

  /**
   * Clean up old entries
   * @param {number} timeWindow - Time window in milliseconds
   */
  cleanup(timeWindow) {
    const now = Date.now();
    
    for (const [userId, attempts] of this.attempts.entries()) {
      const validAttempts = attempts.filter(timestamp => now - timestamp < timeWindow);
      
      if (validAttempts.length === 0) {
        this.attempts.delete(userId);
      } else {
        this.attempts.set(userId, validAttempts);
      }
    }
    
    logger.debug('Rate limiter cleanup completed');
  }

  /**
   * Get remaining attempts for a user
   * @param {string} userId - User ID
   * @param {number} maxAttempts - Maximum attempts allowed
   * @param {number} timeWindow - Time window in milliseconds
   * @returns {number} Remaining attempts
   */
  getRemaining(userId, maxAttempts, timeWindow) {
    const now = Date.now();
    const userAttempts = this.attempts.get(userId) || [];
    const validAttempts = userAttempts.filter(timestamp => now - timestamp < timeWindow);
    
    return Math.max(0, maxAttempts - validAttempts.length);
  }
}

// Export singleton instance
export default new RateLimiter();

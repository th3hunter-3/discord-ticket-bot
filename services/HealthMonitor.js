/**
 * Health Monitor Service
 * Monitors bot health, performance, and system metrics
 */

import logger from '../utils/logger.js';
import { EmbedBuilder } from 'discord.js';

class HealthMonitor {
  constructor() {
    this.metrics = {
      startTime: Date.now(),
      commands: 0,
      errors: 0,
      tickets: 0,
      autoModActions: 0,
      nukeDetections: 0
    };

    this.systemMetrics = {
      memory: {},
      cpu: {},
      uptime: 0
    };

    this.healthChecks = new Map();
    this.alerts = [];
  }

  /**
   * Record command execution
   */
  recordCommand() {
    this.metrics.commands++;
  }

  /**
   * Record error
   */
  recordError() {
    this.metrics.errors++;
  }

  /**
   * Record ticket creation
   */
  recordTicket() {
    this.metrics.tickets++;
  }

  /**
   * Record auto-mod action
   */
  recordAutoModAction() {
    this.metrics.autoModActions++;
  }

  /**
   * Record nuke detection
   */
  recordNukeDetection() {
    this.metrics.nukeDetections++;
  }

  /**
   * Update system metrics
   */
  updateSystemMetrics() {
    const usage = process.memoryUsage();
    this.systemMetrics.memory = {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      rss: Math.round(usage.rss / 1024 / 1024),
      external: Math.round(usage.external / 1024 / 1024)
    };

    this.systemMetrics.uptime = Math.floor((Date.now() - this.metrics.startTime) / 1000);
    
    // Check for memory issues
    const memoryUsagePercent = (usage.heapUsed / usage.heapTotal) * 100;
    if (memoryUsagePercent > 90) {
      this.addAlert('high_memory', 'Memory usage is above 90%', 'warning');
    }
  }

  /**
   * Add health check
   * @param {string} name - Check name
   * @param {Function} checkFn - Check function
   */
  addCheck(name, checkFn) {
    this.healthChecks.set(name, checkFn);
  }

  /**
   * Run all health checks
   * @param {Client} client - Discord client
   * @returns {Promise<Object>} Health status
   */
  async runChecks(client) {
    const results = {
      status: 'healthy',
      checks: {},
      timestamp: new Date().toISOString()
    };

    // Bot connection check
    results.checks.botConnected = {
      status: client.isReady() ? 'pass' : 'fail',
      message: client.isReady() ? 'Bot is connected' : 'Bot is not connected'
    };

    // Database check
    try {
      const mongoose = await import('mongoose');
      results.checks.database = {
        status: mongoose.default.connection.readyState === 1 ? 'pass' : 'fail',
        message: mongoose.default.connection.readyState === 1 ? 'Database connected' : 'Database disconnected'
      };
    } catch (error) {
      results.checks.database = {
        status: 'fail',
        message: 'Database check failed: ' + error.message
      };
    }

    // Run custom checks
    for (const [name, checkFn] of this.healthChecks.entries()) {
      try {
        const result = await checkFn(client);
        results.checks[name] = result;
      } catch (error) {
        results.checks[name] = {
          status: 'fail',
          message: error.message
        };
      }
    }

    // Determine overall status
    const hasFailures = Object.values(results.checks).some(check => check.status === 'fail');
    results.status = hasFailures ? 'unhealthy' : 'healthy';

    return results;
  }

  /**
   * Add alert
   * @param {string} type - Alert type
   * @param {string} message - Alert message
   * @param {string} severity - Severity level
   */
  addAlert(type, message, severity = 'info') {
    const alert = {
      type,
      message,
      severity,
      timestamp: Date.now()
    };

    this.alerts.push(alert);
    logger.warn(`Health alert: ${type} - ${message}`);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }
  }

  /**
   * Get health report
   * @param {Client} client - Discord client
   * @returns {Promise<EmbedBuilder>} Health report embed
   */
  async getHealthReport(client) {
    this.updateSystemMetrics();
    const health = await this.runChecks(client);

    const uptime = this.systemMetrics.uptime;
    const uptimeStr = `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`;

    const embed = new EmbedBuilder()
      .setColor(health.status === 'healthy' ? '#00FF00' : '#FF0000')
      .setTitle(`🏥 Health Status: ${health.status.toUpperCase()}`)
      .addFields(
        {
          name: '📊 Metrics',
          value: [
            `Commands: ${this.metrics.commands}`,
            `Tickets: ${this.metrics.tickets}`,
            `Auto-Mod Actions: ${this.metrics.autoModActions}`,
            `Errors: ${this.metrics.errors}`
          ].join('\n'),
          inline: true
        },
        {
          name: '💾 Memory',
          value: [
            `Heap: ${this.systemMetrics.memory.heapUsed}MB / ${this.systemMetrics.memory.heapTotal}MB`,
            `RSS: ${this.systemMetrics.memory.rss}MB`
          ].join('\n'),
          inline: true
        },
        {
          name: '⏱️ Uptime',
          value: uptimeStr,
          inline: true
        }
      )
      .setTimestamp();

    // Add health checks
    const checksStr = Object.entries(health.checks)
      .map(([name, check]) => `${check.status === 'pass' ? '✅' : '❌'} ${name}`)
      .join('\n');

    embed.addFields({ name: '🔍 Health Checks', value: checksStr || 'No checks' });

    // Add recent alerts if any
    const recentAlerts = this.alerts.slice(-5);
    if (recentAlerts.length > 0) {
      const alertsStr = recentAlerts
        .map(alert => `${this.getAlertEmoji(alert.severity)} ${alert.type}: ${alert.message}`)
        .join('\n');
      
      embed.addFields({ name: '⚠️ Recent Alerts', value: alertsStr });
    }

    return embed;
  }

  /**
   * Get alert emoji
   */
  getAlertEmoji(severity) {
    switch (severity) {
      case 'critical': return '🔴';
      case 'warning': return '🟡';
      case 'info': return '🔵';
      default: return '⚪';
    }
  }

  /**
   * Get metrics
   * @returns {Object} Metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      ...this.systemMetrics
    };
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      startTime: Date.now(),
      commands: 0,
      errors: 0,
      tickets: 0,
      autoModActions: 0,
      nukeDetections: 0
    };
    this.alerts = [];
    logger.info('Health monitor metrics reset');
  }
}

// Export singleton instance
export default new HealthMonitor();

// Update system metrics every 30 seconds
setInterval(() => {
  try {
    const monitor = (await import('./HealthMonitor.js')).default;
    monitor.updateSystemMetrics();
  } catch (error) {
    logger.error('Health monitor update error:', error);
  }
}, 30000);

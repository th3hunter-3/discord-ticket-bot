/**
 * Branding Service
 * White-label branding and customization per guild
 */

import logger from '../utils/logger.js';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

class BrandingService {
  constructor() {
    this.cache = new Map();
    this.brandingPath = join(process.cwd(), 'config', 'branding');
  }

  /**
   * Get branding for a guild
   * @param {string} guildId - Guild ID
   * @returns {Promise<Object>} Branding configuration
   */
  async getBranding(guildId) {
    // Check cache first
    if (this.cache.has(guildId)) {
      return this.cache.get(guildId);
    }

    try {
      const brandingFile = join(this.brandingPath, `${guildId}.json`);
      
      if (existsSync(brandingFile)) {
        const data = await readFile(brandingFile, 'utf8');
        const branding = JSON.parse(data);
        this.cache.set(guildId, branding);
        return branding;
      }
    } catch (error) {
      logger.error(`Error loading branding for guild ${guildId}:`, error);
    }

    // Return default branding
    return this.getDefaultBranding();
  }

  /**
   * Get default branding
   * @returns {Object} Default branding
   */
  getDefaultBranding() {
    return {
      name: 'Discord Ticket Bot',
      colors: {
        primary: '#5865F2',
        success: '#57F287',
        warning: '#FEE75C',
        error: '#ED4245',
        info: '#00D9FF'
      },
      emojis: {
        ticket: '🎫',
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️',
        lock: '🔒',
        unlock: '🔓'
      },
      logo: null,
      footer: {
        text: 'Discord Ticket Bot',
        icon: null
      },
      supportServer: null,
      website: null,
      customMessages: {
        welcome: 'Welcome! Click the button below to create a ticket.',
        ticketCreated: 'Your ticket has been created!',
        ticketClosed: 'This ticket has been closed.'
      }
    };
  }

  /**
   * Set branding for a guild
   * @param {string} guildId - Guild ID
   * @param {Object} branding - Branding configuration
   */
  async setBranding(guildId, branding) {
    try {
      // Merge with default branding
      const defaultBranding = this.getDefaultBranding();
      const mergedBranding = this.deepMerge(defaultBranding, branding);

      // Save to file
      const brandingFile = join(this.brandingPath, `${guildId}.json`);
      await writeFile(brandingFile, JSON.stringify(mergedBranding, null, 2));

      // Update cache
      this.cache.set(guildId, mergedBranding);

      logger.info(`Branding updated for guild ${guildId}`);
      return true;
    } catch (error) {
      logger.error(`Error saving branding for guild ${guildId}:`, error);
      return false;
    }
  }

  /**
   * Deep merge objects
   */
  deepMerge(target, source) {
    const output = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        output[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        output[key] = source[key];
      }
    }
    
    return output;
  }

  /**
   * Apply branding to embed
   * @param {EmbedBuilder} embed - Discord embed
   * @param {string} guildId - Guild ID
   * @returns {Promise<EmbedBuilder>} Branded embed
   */
  async applyBranding(embed, guildId) {
    const branding = await this.getBranding(guildId);

    // Set footer if not already set
    if (!embed.data.footer && branding.footer) {
      embed.setFooter({
        text: branding.footer.text,
        iconURL: branding.footer.icon
      });
    }

    // Set thumbnail if logo exists and no thumbnail set
    if (!embed.data.thumbnail && branding.logo) {
      embed.setThumbnail(branding.logo);
    }

    return embed;
  }

  /**
   * Get branded message
   * @param {string} guildId - Guild ID
   * @param {string} messageKey - Message key
   * @returns {Promise<string>} Branded message
   */
  async getBrandedMessage(guildId, messageKey) {
    const branding = await this.getBranding(guildId);
    return branding.customMessages?.[messageKey] || 
           this.getDefaultBranding().customMessages[messageKey] ||
           '';
  }

  /**
   * Get color
   * @param {string} guildId - Guild ID
   * @param {string} colorKey - Color key
   * @returns {Promise<string>} Color hex code
   */
  async getColor(guildId, colorKey) {
    const branding = await this.getBranding(guildId);
    return branding.colors?.[colorKey] || 
           this.getDefaultBranding().colors[colorKey] ||
           '#5865F2';
  }

  /**
   * Get emoji
   * @param {string} guildId - Guild ID
   * @param {string} emojiKey - Emoji key
   * @returns {Promise<string>} Emoji
   */
  async getEmoji(guildId, emojiKey) {
    const branding = await this.getBranding(guildId);
    return branding.emojis?.[emojiKey] || 
           this.getDefaultBranding().emojis[emojiKey] ||
           '📌';
  }

  /**
   * Reset branding for a guild
   * @param {string} guildId - Guild ID
   */
  async resetBranding(guildId) {
    try {
      const brandingFile = join(this.brandingPath, `${guildId}.json`);
      
      if (existsSync(brandingFile)) {
        const fs = await import('fs/promises');
        await fs.unlink(brandingFile);
      }

      this.cache.delete(guildId);
      logger.info(`Branding reset for guild ${guildId}`);
      return true;
    } catch (error) {
      logger.error(`Error resetting branding for guild ${guildId}:`, error);
      return false;
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    logger.info('Branding cache cleared');
  }
}

// Export singleton instance
export default new BrandingService();

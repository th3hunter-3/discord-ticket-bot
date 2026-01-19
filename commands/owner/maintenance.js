/**
 * Maintenance Command
 * 
 * Enable/disable maintenance mode (bot lock to owner-only access)
 * Owner only
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import logger from '../../utils/logger.js';

// Global maintenance state
let maintenanceMode = false;
let maintenanceReason = 'Scheduled maintenance';

export function isMaintenanceMode() {
  return maintenanceMode;
}

export function getMaintenanceReason() {
  return maintenanceReason;
}

export default {
  data: new SlashCommandBuilder()
    .setName('maintenance')
    .setDescription('Enable/disable maintenance mode (owner only)')
    .addSubcommand(subcommand =>
      subcommand
        .setName('enable')
        .setDescription('Enable maintenance mode')
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Reason for maintenance')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('disable')
        .setDescription('Disable maintenance mode'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Check maintenance status')),
  
  execute: async function(interaction) {
    // Owner check
    const ownerIds = process.env.OWNER_IDS?.split(',') || [];
    if (!ownerIds.includes(interaction.user.id)) {
      return await interaction.reply({
        content: '❌ This command is restricted to bot owners only.',
        ephemeral: true
      });
    }
    
    const subcommand = interaction.options.getSubcommand();
    
    try {
      if (subcommand === 'enable') {
        const reason = interaction.options.getString('reason') || 'Scheduled maintenance';
        
        maintenanceMode = true;
        maintenanceReason = reason;
        
        logger.warn(`Maintenance mode ENABLED by ${interaction.user.tag}: ${reason}`);
        
        const embed = new EmbedBuilder()
          .setTitle('🔒 Maintenance Mode Enabled')
          .setDescription('The bot is now in maintenance mode. Only bot owners can use commands.')
          .addFields(
            { name: 'Reason', value: reason },
            { name: 'Enabled By', value: interaction.user.tag },
            { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
          )
          .setColor(0xFF9900)
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
        
      } else if (subcommand === 'disable') {
        if (!maintenanceMode) {
          return await interaction.reply({
            content: '❌ Maintenance mode is not currently enabled.',
            ephemeral: true
          });
        }
        
        maintenanceMode = false;
        
        logger.info(`Maintenance mode DISABLED by ${interaction.user.tag}`);
        
        const embed = new EmbedBuilder()
          .setTitle('✅ Maintenance Mode Disabled')
          .setDescription('The bot is now operational. All users can use commands again.')
          .addFields(
            { name: 'Disabled By', value: interaction.user.tag },
            { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
          )
          .setColor(0x00FF00)
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
        
      } else if (subcommand === 'status') {
        const embed = new EmbedBuilder()
          .setTitle('🔧 Maintenance Mode Status')
          .addFields(
            { name: 'Status', value: maintenanceMode ? '🔒 **ENABLED**' : '✅ **DISABLED**' }
          )
          .setColor(maintenanceMode ? 0xFF9900 : 0x00FF00)
          .setTimestamp();
        
        if (maintenanceMode) {
          embed.addFields(
            { name: 'Reason', value: maintenanceReason },
            { name: 'Note', value: 'Only bot owners can use commands while maintenance mode is active.' }
          );
        }
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
      
    } catch (error) {
      logger.error('Error in maintenance command:', error);
      await interaction.reply({
        content: '❌ An error occurred while managing maintenance mode.',
        ephemeral: true
      });
    }
  }
};

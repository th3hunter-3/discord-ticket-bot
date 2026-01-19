/**
 * Force Sync Command
 * 
 * Manually trigger ticket synchronization
 * Owner only
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import startupService from '../../services/StartupService.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('force-sync')
    .setDescription('Manually synchronize tickets (owner only)'),
  
  execute: async function(interaction) {
    // Owner check
    const ownerIds = process.env.OWNER_IDS?.split(',') || [];
    if (!ownerIds.includes(interaction.user.id)) {
      return await interaction.reply({
        content: '❌ This command is restricted to bot owners only.',
        ephemeral: true
      });
    }
    
    try {
      await interaction.deferReply({ ephemeral: true });
      
      logger.info(`Force sync triggered by ${interaction.user.tag}`);
      
      // Run synchronization
      await startupService.synchronizeTickets(interaction.client);
      
      // Get results from the service
      const ticketResults = startupService.syncResults.tickets;
      
      const embed = new EmbedBuilder()
        .setTitle('🔄 Ticket Synchronization Complete')
        .setDescription('Finished synchronizing all tickets across guilds.')
        .addFields(
          { name: '✅ Synced', value: ticketResults.synced.toString(), inline: true },
          { name: '🗑️ Orphaned', value: ticketResults.orphaned.toString(), inline: true },
          { name: '🔧 Repaired', value: ticketResults.repaired.toString(), inline: true }
        )
        .setColor(0x00FF00)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      
      // Reset results for next sync
      startupService.syncResults.tickets = { synced: 0, orphaned: 0, repaired: 0 };
      
    } catch (error) {
      logger.error('Error in force-sync command:', error);
      await interaction.editReply({
        content: '❌ An error occurred during synchronization. Check logs for details.'
      });
    }
  }
};

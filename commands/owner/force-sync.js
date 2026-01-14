/**
 * Force Sync Command
 * 
 * Manually trigger ticket synchronization
 * Owner only
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { synchronizeTickets } from '../../services/StartupService.js';
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
      const result = await synchronizeTickets(interaction.client);
      
      const embed = new EmbedBuilder()
        .setTitle('🔄 Ticket Synchronization Complete')
        .setDescription('Finished synchronizing all tickets across guilds.')
        .addFields(
          { name: '✅ Synced', value: result.synced.toString(), inline: true },
          { name: '🗑️ Orphaned', value: result.orphaned.toString(), inline: true },
          { name: '🔧 Repaired', value: result.repaired.toString(), inline: true },
          { name: '❌ Errors', value: result.errors.toString(), inline: true }
        )
        .setColor(result.errors > 0 ? 0xFF9900 : 0x00FF00)
        .setTimestamp();
      
      if (result.details && result.details.length > 0) {
        const details = result.details.slice(0, 5).join('\n');
        embed.addFields({ name: 'Details', value: details.substring(0, 1024) });
      }
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      logger.error('Error in force-sync command:', error);
      await interaction.editReply({
        content: '❌ An error occurred during synchronization. Check logs for details.'
      });
    }
  }
};

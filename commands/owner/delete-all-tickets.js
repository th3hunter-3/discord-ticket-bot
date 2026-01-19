/**
 * Delete All Tickets Command
 * 
 * Delete ALL tickets from database (EXTREMELY DANGEROUS)
 * Owner only - for emergency cleanup
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import Ticket from '../../models/Ticket.js';
import logger from '../../utils/logger.js';
import { writeFile } from 'fs/promises';

export default {
  data: new SlashCommandBuilder()
    .setName('delete-all-tickets')
    .setDescription('Delete ALL tickets from database (DANGEROUS - owner only)')
    .addStringOption(option =>
      option.setName('confirm')
        .setDescription('Type "DELETE ALL TICKETS" to confirm')
        .setRequired(true)),
  
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
      const confirmation = interaction.options.getString('confirm');
      
      if (confirmation !== 'DELETE ALL TICKETS') {
        return await interaction.reply({
          content: '❌ Confirmation failed. You must type "DELETE ALL TICKETS" exactly to confirm this action.',
          ephemeral: true
        });
      }
      
      await interaction.deferReply({ ephemeral: true });
      
      // Get all tickets for backup
      const allTickets = await Ticket.find({});
      
      if (allTickets.length === 0) {
        return await interaction.editReply({
          content: '✅ No tickets found in database.'
        });
      }
      
      // Create backup
      const backup = {
        timestamp: new Date().toISOString(),
        deletedBy: interaction.user.id,
        deletedByTag: interaction.user.tag,
        totalTickets: allTickets.length,
        tickets: allTickets.map(t => t.toObject())
      };
      
      const backupPath = `/tmp/tickets_backup_${Date.now()}.json`;
      await writeFile(backupPath, JSON.stringify(backup, null, 2));
      
      logger.warn(`CRITICAL: ${interaction.user.tag} is deleting ALL ${allTickets.length} tickets. Backup created at ${backupPath}`);
      
      // Delete all tickets
      const deleteResult = await Ticket.deleteMany({});
      
      // Send backup to owner
      try {
        await interaction.user.send({
          content: '⚠️ **Backup of Deleted Tickets**\n\nYou requested to delete all tickets. Here is the backup file.',
          files: [{ attachment: backupPath, name: `tickets_backup_${Date.now()}.json` }]
        });
      } catch (error) {
        logger.error('Could not send backup to owner:', error);
      }
      
      const embed = new EmbedBuilder()
        .setTitle('⚠️ All Tickets Deleted')
        .setDescription(`Successfully deleted **${deleteResult.deletedCount}** tickets from the database.`)
        .addFields(
          { name: 'Deleted By', value: interaction.user.tag },
          { name: 'Backup', value: 'Sent to your DMs' },
          { name: 'Warning', value: 'This action cannot be undone. Channels must be deleted manually.' }
        )
        .setColor(0xFF0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      
      logger.error(`ALL TICKETS DELETED by ${interaction.user.tag}: ${deleteResult.deletedCount} tickets removed`);
      
    } catch (error) {
      logger.error('Error in delete-all-tickets command:', error);
      await interaction.editReply({
        content: '❌ An error occurred while deleting tickets. Check logs for details.'
      });
    }
  }
};

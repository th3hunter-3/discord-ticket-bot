/**
 * Close All Command
 * 
 * Close all open tickets across all guilds
 * Owner only - for emergency situations
 */

import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import Ticket from '../../models/Ticket.js';
import { closeTicket } from '../../utils/ticketHandler.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('close-all')
    .setDescription('Close all open tickets (owner only - DANGEROUS)')
    .addBooleanOption(option =>
      option.setName('generate-transcripts')
        .setDescription('Generate transcripts for all tickets (slower)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for closing all tickets')
        .setRequired(false)),
  
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
      // Get all open tickets
      const openTickets = await Ticket.find({ status: { $in: ['open', 'claimed'] } });
      
      if (openTickets.length === 0) {
        return await interaction.reply({
          content: '✅ There are no open tickets to close.',
          ephemeral: true
        });
      }
      
      // Confirmation required
      const confirmButton = new ButtonBuilder()
        .setCustomId('confirm_close_all')
        .setLabel(`Close ${openTickets.length} Tickets`)
        .setStyle(ButtonStyle.Danger);
      
      const cancelButton = new ButtonBuilder()
        .setCustomId('cancel_close_all')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary);
      
      const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);
      
      const embed = new EmbedBuilder()
        .setTitle('⚠️ Close All Tickets')
        .setDescription(`Are you sure you want to close **${openTickets.length}** open tickets?`)
        .addFields(
          { name: 'Generate Transcripts', value: interaction.options.getBoolean('generate-transcripts') ? 'Yes' : 'No' },
          { name: 'Warning', value: 'This action cannot be undone. All tickets will be closed immediately.' }
        )
        .setColor(0xFF0000)
        .setTimestamp();
      
      const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
      
      // Wait for confirmation
      const filter = i => i.user.id === interaction.user.id && (i.customId === 'confirm_close_all' || i.customId === 'cancel_close_all');
      const collector = message.createMessageComponentCollector({ filter, time: 30000, max: 1 });
      
      collector.on('collect', async i => {
        if (i.customId === 'cancel_close_all') {
          await i.update({
            content: '✅ Cancelled. No tickets were closed.',
            embeds: [],
            components: []
          });
          return;
        }
        
        // Confirmed - start closing tickets
        await i.update({
          content: `🔄 Closing ${openTickets.length} tickets... This may take a while.`,
          embeds: [],
          components: []
        });
        
        const generateTranscripts = interaction.options.getBoolean('generate-transcripts') || false;
        const reason = interaction.options.getString('reason') || 'Bulk close by bot owner';
        
        let closed = 0;
        let failed = 0;
        const errors = [];
        
        for (const ticket of openTickets) {
          try {
            const guild = await interaction.client.guilds.fetch(ticket.guildId).catch(() => null);
            if (!guild) {
              ticket.status = 'closed';
              ticket.closedAt = new Date();
              ticket.closedBy = interaction.user.id;
              ticket.closingNote = reason;
              await ticket.save();
              closed++;
              continue;
            }
            
            const channel = await guild.channels.fetch(ticket.channelId).catch(() => null);
            if (!channel) {
              ticket.status = 'closed';
              ticket.closedAt = new Date();
              ticket.closedBy = interaction.user.id;
              ticket.closingNote = reason;
              await ticket.save();
              closed++;
              continue;
            }
            
            // Close ticket using handler
            await closeTicket(ticket, channel, interaction.user, reason, generateTranscripts);
            closed++;
            
            // Add small delay to prevent rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
            
          } catch (error) {
            logger.error(`Error closing ticket ${ticket.ticketId}:`, error);
            failed++;
            errors.push(`${ticket.ticketId}: ${error.message}`);
          }
        }
        
        // Summary
        const summaryEmbed = new EmbedBuilder()
          .setTitle('✅ Close All Tickets - Complete')
          .setDescription(`Finished processing ${openTickets.length} tickets.`)
          .addFields(
            { name: '✅ Closed', value: closed.toString(), inline: true },
            { name: '❌ Failed', value: failed.toString(), inline: true },
            { name: 'Transcripts Generated', value: generateTranscripts ? 'Yes' : 'No', inline: true }
          )
          .setColor(failed > 0 ? 0xFF9900 : 0x00FF00)
          .setTimestamp();
        
        if (errors.length > 0 && errors.length <= 5) {
          summaryEmbed.addFields({ name: 'Errors', value: errors.join('\n').substring(0, 1024) });
        }
        
        await interaction.editReply({ content: null, embeds: [summaryEmbed] });
        
        logger.warn(`Close all tickets executed by ${interaction.user.tag}: ${closed} closed, ${failed} failed`);
      });
      
      collector.on('end', async collected => {
        if (collected.size === 0) {
          await interaction.editReply({
            content: '⏱️ Confirmation timeout. No tickets were closed.',
            embeds: [],
            components: []
          });
        }
      });
      
    } catch (error) {
      logger.error('Error in close-all command:', error);
      await interaction.reply({
        content: '❌ An error occurred while closing tickets.',
        ephemeral: true
      });
    }
  }
};

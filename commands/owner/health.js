/**
 * Health Command
 * View bot health and metrics (Owner only)
 */

import { SlashCommandBuilder } from 'discord.js';
import healthMonitor from '../../services/HealthMonitor.js';

export default {
  data: new SlashCommandBuilder()
    .setName('health')
    .setDescription('View bot health and metrics (Owner only)'),

  /**
   * Execute health command
   * @param {CommandInteraction} interaction - Command interaction
   */
  execute: async function(interaction) {
    // Check if user is owner
    const ownerIds = process.env.OWNER_IDS?.split(',') || [];
    if (!ownerIds.includes(interaction.user.id)) {
      return await interaction.reply({
        content: '❌ This command is only available to bot owners.',
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const embed = await healthMonitor.getHealthReport(interaction.client);
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({
        content: '❌ Failed to generate health report.'
      });
    }
  }
};

/**
 * Reload Commands Command
 * Reload all commands (Owner only)
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { loadCommands } from '../../handlers/commandHandler.js';
import config from '../../config.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('reload-commands')
    .setDescription('Reload all commands (Owner only)'),

  /**
   * Execute reload-commands command
   * @param {CommandInteraction} interaction - Command interaction
   */
  async execute(interaction) {
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
      // Reload commands
      interaction.client.commands = await loadCommands(interaction.client);

      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('✅ Commands Reloaded')
        .setDescription(`Successfully reloaded ${interaction.client.commands.size} commands.`)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      logger.info(`Commands reloaded by ${interaction.user.tag}`);

    } catch (error) {
      logger.error('Error reloading commands:', error);

      const embed = new EmbedBuilder()
        .setColor(config.colors.error)
        .setTitle('❌ Reload Failed')
        .setDescription('An error occurred while reloading commands.')
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }
  }
};

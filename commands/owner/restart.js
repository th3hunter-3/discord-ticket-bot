/**
 * Restart Command
 * Restart the bot (Owner only)
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import config from '../../config.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('restart')
    .setDescription('Restart the bot (Owner only)'),

  /**
   * Execute restart command
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

    const embed = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setTitle('🔄 Restarting Bot')
      .setDescription('The bot is restarting. This may take a few seconds...')
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });

    logger.info(`Bot restart initiated by ${interaction.user.tag}`);

    // Wait a moment to ensure response is sent
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  }
};

/**
 * Eval Command
 * Evaluate JavaScript code (Owner only)
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { inspect } from 'util';
import config from '../../config.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('eval')
    .setDescription('Evaluate JavaScript code (Owner only)')
    .addStringOption(option =>
      option
        .setName('code')
        .setDescription('JavaScript code to evaluate')
        .setRequired(true)
    ),

  /**
   * Execute eval command
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

    const code = interaction.options.getString('code');

    try {
      // Evaluate code
      let result = eval(code);

      // Handle promises
      if (result instanceof Promise) {
        result = await result;
      }

      // Inspect result
      let output = inspect(result, { depth: 0 });

      // Limit output length
      if (output.length > 1900) {
        output = output.substring(0, 1900) + '...';
      }

      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('✅ Evaluation Result')
        .addFields(
          { name: 'Input', value: `\`\`\`js\n${code.substring(0, 1000)}\`\`\`` },
          { name: 'Output', value: `\`\`\`js\n${output}\`\`\`` }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });

      logger.info(`Eval executed by ${interaction.user.tag}: ${code}`);

    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(config.colors.error)
        .setTitle('❌ Evaluation Error')
        .addFields(
          { name: 'Input', value: `\`\`\`js\n${code.substring(0, 1000)}\`\`\`` },
          { name: 'Error', value: `\`\`\`js\n${error.message}\`\`\`` }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });

      logger.error(`Eval error by ${interaction.user.tag}:`, error);
    }
  }
};

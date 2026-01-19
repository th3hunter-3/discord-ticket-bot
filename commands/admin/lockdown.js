/**
 * Lockdown Command
 * Enable/disable lockdown mode
 */

import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import GuildConfig from '../../models/GuildConfig.js';
import config from '../../config.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('lockdown')
    .setDescription('Manage ticket lockdown mode')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('enable')
        .setDescription('Enable lockdown mode')
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('Reason for lockdown')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('disable')
        .setDescription('Disable lockdown mode')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Check lockdown status')
    ),

  permissions: [PermissionFlagsBits.Administrator],

  /**
   * Execute lockdown command
   * @param {CommandInteraction} interaction - Command interaction
   */
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildConfig = await GuildConfig.getConfig(interaction.guild.id);

    switch (subcommand) {
      case 'enable':
        const reason = interaction.options.getString('reason') || 'Maintenance';
        
        guildConfig.lockdownMode = true;
        guildConfig.lockdownReason = reason;
        await guildConfig.save();

        const enableEmbed = new EmbedBuilder()
          .setColor(config.colors.warning)
          .setTitle('🔒 Lockdown Enabled')
          .setDescription('Ticket creation has been disabled.')
          .addFields({ name: 'Reason', value: reason })
          .setTimestamp();

        await interaction.reply({ embeds: [enableEmbed] });

        logger.info(`Lockdown enabled in ${interaction.guild.name} by ${interaction.user.tag}: ${reason}`);
        break;

      case 'disable':
        if (!guildConfig.lockdownMode) {
          return await interaction.reply({
            content: '❌ Lockdown mode is not enabled.',
            ephemeral: true
          });
        }

        guildConfig.lockdownMode = false;
        guildConfig.lockdownReason = null;
        await guildConfig.save();

        const disableEmbed = new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle('🔓 Lockdown Disabled')
          .setDescription('Ticket creation has been re-enabled.')
          .setTimestamp();

        await interaction.reply({ embeds: [disableEmbed] });

        logger.info(`Lockdown disabled in ${interaction.guild.name} by ${interaction.user.tag}`);
        break;

      case 'status':
        const statusEmbed = new EmbedBuilder()
          .setColor(guildConfig.lockdownMode ? config.colors.warning : config.colors.success)
          .setTitle('🔒 Lockdown Status')
          .addFields(
            { name: 'Status', value: guildConfig.lockdownMode ? '🔒 Enabled' : '🔓 Disabled', inline: true }
          )
          .setTimestamp();

        if (guildConfig.lockdownMode && guildConfig.lockdownReason) {
          statusEmbed.addFields({ name: 'Reason', value: guildConfig.lockdownReason, inline: true });
        }

        await interaction.reply({ embeds: [statusEmbed], ephemeral: true });
        break;
    }
  }
};

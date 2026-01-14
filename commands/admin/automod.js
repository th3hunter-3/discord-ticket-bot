/**
 * AutoMod Command
 * Configure auto-moderation settings
 */

import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import GuildConfig from '../../models/GuildConfig.js';
import config from '../../config.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Configure auto-moderation')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('enable')
        .setDescription('Enable auto-moderation')
        .addChannelOption(option =>
          option
            .setName('log-channel')
            .setDescription('Channel for auto-mod logs')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('disable')
        .setDescription('Disable auto-moderation')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('config')
        .setDescription('Configure auto-mod filters')
        .addStringOption(option =>
          option
            .setName('filter')
            .setDescription('Filter to configure')
            .setRequired(true)
            .addChoices(
              { name: 'Invites', value: 'invites' },
              { name: 'Links', value: 'links' },
              { name: 'Mentions', value: 'mentions' },
              { name: 'Spam', value: 'spam' },
              { name: 'Caps', value: 'caps' },
              { name: 'Bad Words', value: 'badWords' },
              { name: 'Zalgo', value: 'zalgo' }
            )
        )
        .addBooleanOption(option =>
          option
            .setName('enabled')
            .setDescription('Enable or disable this filter')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('View auto-mod configuration')
    ),

  permissions: [PermissionFlagsBits.Administrator],

  /**
   * Execute automod command
   * @param {CommandInteraction} interaction - Command interaction
   */
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'enable':
        await handleEnable(interaction);
        break;
      case 'disable':
        await handleDisable(interaction);
        break;
      case 'config':
        await handleConfig(interaction);
        break;
      case 'status':
        await handleStatus(interaction);
        break;
    }
  }
};

/**
 * Handle enable
 */
async function handleEnable(interaction) {
  const logChannel = interaction.options.getChannel('log-channel');

  try {
    const guildConfig = await GuildConfig.getConfig(interaction.guild.id);

    guildConfig.autoMod = guildConfig.autoMod || {};
    guildConfig.autoMod.enabled = true;
    guildConfig.autoMod.logChannelId = logChannel.id;
    
    await guildConfig.save();

    const embed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle('✅ Auto-Moderation Enabled')
      .setDescription('Auto-moderation has been enabled for this server.')
      .addFields(
        { name: 'Log Channel', value: `<#${logChannel.id}>`, inline: true },
        { name: 'Status', value: '🟢 Active', inline: true }
      )
      .setFooter({ text: 'Use /automod config to configure filters' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    logger.info(`Auto-mod enabled in ${interaction.guild.name} by ${interaction.user.tag}`);
  } catch (error) {
    logger.error('Error enabling auto-mod:', error);
    await interaction.reply({
      content: '❌ Failed to enable auto-moderation.',
      ephemeral: true
    });
  }
}

/**
 * Handle disable
 */
async function handleDisable(interaction) {
  try {
    const guildConfig = await GuildConfig.getConfig(interaction.guild.id);

    if (!guildConfig.autoMod?.enabled) {
      return await interaction.reply({
        content: '❌ Auto-moderation is not enabled.',
        ephemeral: true
      });
    }

    guildConfig.autoMod.enabled = false;
    await guildConfig.save();

    const embed = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setTitle('🔴 Auto-Moderation Disabled')
      .setDescription('Auto-moderation has been disabled for this server.')
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    logger.info(`Auto-mod disabled in ${interaction.guild.name} by ${interaction.user.tag}`);
  } catch (error) {
    logger.error('Error disabling auto-mod:', error);
    await interaction.reply({
      content: '❌ Failed to disable auto-moderation.',
      ephemeral: true
    });
  }
}

/**
 * Handle config
 */
async function handleConfig(interaction) {
  const filter = interaction.options.getString('filter');
  const enabled = interaction.options.getBoolean('enabled');

  try {
    const guildConfig = await GuildConfig.getConfig(interaction.guild.id);

    if (!guildConfig.autoMod) {
      return await interaction.reply({
        content: '❌ Auto-moderation is not set up. Use `/automod enable` first.',
        ephemeral: true
      });
    }

    // Update filter
    if (!guildConfig.autoMod.filters) {
      guildConfig.autoMod.filters = {};
    }
    
    if (!guildConfig.autoMod.filters[filter]) {
      guildConfig.autoMod.filters[filter] = {};
    }

    guildConfig.autoMod.filters[filter].enabled = enabled;
    
    // Mark as modified for nested objects
    guildConfig.markModified('autoMod');
    await guildConfig.save();

    const embed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle('✅ Filter Updated')
      .setDescription(`**${filter}** filter has been ${enabled ? 'enabled' : 'disabled'}.`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    logger.info(`Auto-mod filter ${filter} ${enabled ? 'enabled' : 'disabled'} in ${interaction.guild.name}`);
  } catch (error) {
    logger.error('Error configuring auto-mod filter:', error);
    await interaction.reply({
      content: '❌ Failed to configure filter.',
      ephemeral: true
    });
  }
}

/**
 * Handle status
 */
async function handleStatus(interaction) {
  try {
    const guildConfig = await GuildConfig.getConfig(interaction.guild.id);

    if (!guildConfig.autoMod?.enabled) {
      return await interaction.reply({
        content: '❌ Auto-moderation is not enabled in this server.',
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.info)
      .setTitle('🤖 Auto-Moderation Status')
      .addFields(
        { name: 'Status', value: '🟢 Enabled', inline: true },
        { name: 'Log Channel', value: guildConfig.autoMod.logChannelId ? `<#${guildConfig.autoMod.logChannelId}>` : 'Not set', inline: true }
      )
      .setTimestamp();

    // Add filters status
    const filters = guildConfig.autoMod.filters || {};
    const filtersStatus = [];
    
    for (const [filterName, filterConfig] of Object.entries(filters)) {
      const status = filterConfig.enabled ? '✅' : '❌';
      filtersStatus.push(`${status} **${filterName}**`);
    }

    if (filtersStatus.length > 0) {
      embed.addFields({
        name: 'Filters',
        value: filtersStatus.join('\n')
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    logger.error('Error getting auto-mod status:', error);
    await interaction.reply({
      content: '❌ Failed to get auto-mod status.',
      ephemeral: true
    });
  }
}

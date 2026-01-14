/**
 * Whitelist Command
 * Manage guild whitelist (Owner only)
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import guildWhitelist from '../../middleware/GuildWhitelist.js';
import GuildConfig from '../../models/GuildConfig.js';
import config from '../../config.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription('Manage guild whitelist (Owner only)')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a guild to whitelist')
        .addStringOption(option =>
          option
            .setName('guild-id')
            .setDescription('Guild ID to whitelist')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a guild from whitelist')
        .addStringOption(option =>
          option
            .setName('guild-id')
            .setDescription('Guild ID to remove')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all whitelisted guilds')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('mode')
        .setDescription('Set whitelist mode')
        .addStringOption(option =>
          option
            .setName('mode')
            .setDescription('Whitelist mode')
            .setRequired(true)
            .addChoices(
              { name: 'Strict (whitelist only)', value: 'strict' },
              { name: 'Open (all guilds)', value: 'open' }
            )
        )
    ),

  /**
   * Execute whitelist command
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

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'add':
        await handleAdd(interaction);
        break;
      case 'remove':
        await handleRemove(interaction);
        break;
      case 'list':
        await handleList(interaction);
        break;
      case 'mode':
        await handleMode(interaction);
        break;
    }
  }
};

/**
 * Handle whitelist add
 */
async function handleAdd(interaction) {
  const guildId = interaction.options.getString('guild-id');

  try {
    // Add to whitelist
    guildWhitelist.addGuild(guildId);

    // Update database
    const guildConfig = await GuildConfig.getConfig(guildId);
    guildConfig.whitelisted = true;
    guildConfig.whitelistedBy = interaction.user.id;
    guildConfig.whitelistedAt = new Date();
    await guildConfig.save();

    // Try to get guild info
    let guildName = 'Unknown';
    try {
      const guild = await interaction.client.guilds.fetch(guildId);
      guildName = guild.name;
    } catch (error) {
      // Guild not accessible
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle('✅ Guild Whitelisted')
      .setDescription(`Guild has been added to the whitelist.`)
      .addFields(
        { name: 'Guild ID', value: guildId, inline: true },
        { name: 'Guild Name', value: guildName, inline: true },
        { name: 'Added By', value: interaction.user.tag, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    logger.info(`Guild ${guildId} whitelisted by ${interaction.user.tag}`);
  } catch (error) {
    logger.error('Error whitelisting guild:', error);
    await interaction.reply({
      content: '❌ Failed to whitelist guild.',
      ephemeral: true
    });
  }
}

/**
 * Handle whitelist remove
 */
async function handleRemove(interaction) {
  const guildId = interaction.options.getString('guild-id');

  try {
    // Remove from whitelist
    guildWhitelist.removeGuild(guildId);

    // Update database
    const guildConfig = await GuildConfig.findOne({ guildId });
    if (guildConfig) {
      guildConfig.whitelisted = false;
      await guildConfig.save();
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setTitle('🗑️ Guild Removed from Whitelist')
      .setDescription(`Guild has been removed from the whitelist.`)
      .addFields({ name: 'Guild ID', value: guildId })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    logger.info(`Guild ${guildId} removed from whitelist by ${interaction.user.tag}`);
  } catch (error) {
    logger.error('Error removing guild from whitelist:', error);
    await interaction.reply({
      content: '❌ Failed to remove guild from whitelist.',
      ephemeral: true
    });
  }
}

/**
 * Handle whitelist list
 */
async function handleList(interaction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const whitelisted = guildWhitelist.getWhitelist();

    if (whitelisted.length === 0) {
      return await interaction.editReply({
        content: '📭 No guilds are currently whitelisted.'
      });
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.info)
      .setTitle('📋 Whitelisted Guilds')
      .setDescription(`${whitelisted.length} guild(s) whitelisted`)
      .setTimestamp();

    // Get guild info
    const guildsInfo = [];
    for (const guildId of whitelisted.slice(0, 25)) {
      try {
        const guild = await interaction.client.guilds.fetch(guildId);
        guildsInfo.push({
          name: guild.name,
          value: `ID: ${guildId}\nMembers: ${guild.memberCount}`,
          inline: true
        });
      } catch (error) {
        guildsInfo.push({
          name: 'Unknown Guild',
          value: `ID: ${guildId}\n*Not accessible*`,
          inline: true
        });
      }
    }

    embed.addFields(guildsInfo);

    if (whitelisted.length > 25) {
      embed.setFooter({ text: `Showing 25 of ${whitelisted.length} guilds` });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error('Error listing whitelisted guilds:', error);
    await interaction.editReply({
      content: '❌ Failed to list whitelisted guilds.'
    });
  }
}

/**
 * Handle whitelist mode
 */
async function handleMode(interaction) {
  const mode = interaction.options.getString('mode');

  try {
    if (mode === 'strict') {
      guildWhitelist.enableStrictMode();
    } else {
      guildWhitelist.enableOpenMode();
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle('✅ Whitelist Mode Updated')
      .setDescription(`Whitelist mode set to: **${mode}**`)
      .addFields({
        name: 'Mode Description',
        value: mode === 'strict' 
          ? 'Bot will only work in whitelisted guilds'
          : 'Bot will work in all guilds (whitelist disabled)'
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    logger.info(`Whitelist mode set to ${mode} by ${interaction.user.tag}`);
  } catch (error) {
    logger.error('Error setting whitelist mode:', error);
    await interaction.reply({
      content: '❌ Failed to set whitelist mode.',
      ephemeral: true
    });
  }
}

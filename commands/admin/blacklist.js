/**
 * Blacklist Command
 * Blacklist/unblacklist users from creating tickets
 */

import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import Blacklist from '../../models/Blacklist.js';
import config from '../../config.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('Manage ticket blacklist')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Blacklist a user from creating tickets')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('User to blacklist')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('Reason for blacklist')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a user from blacklist')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('User to unblacklist')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('View all blacklisted users')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('check')
        .setDescription('Check if a user is blacklisted')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('User to check')
            .setRequired(true)
        )
    ),

  permissions: [PermissionFlagsBits.Administrator],

  /**
   * Execute blacklist command
   * @param {CommandInteraction} interaction - Command interaction
   */
  async execute(interaction) {
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
      case 'check':
        await handleCheck(interaction);
        break;
    }
  }
};

/**
 * Handle blacklist add
 */
async function handleAdd(interaction) {
  const user = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason');

  // Check if already blacklisted
  const existing = await Blacklist.findOne({
    guildId: interaction.guild.id,
    userId: user.id,
    active: true
  });

  if (existing) {
    return await interaction.reply({
      content: `❌ ${user.tag} is already blacklisted.`,
      ephemeral: true
    });
  }

  // Create blacklist entry
  await Blacklist.create({
    guildId: interaction.guild.id,
    userId: user.id,
    username: user.tag,
    reason,
    blacklistedBy: interaction.user.id
  });

  const embed = new EmbedBuilder()
    .setColor(config.colors.error)
    .setTitle('🚫 User Blacklisted')
    .setDescription(`${user} has been blacklisted from creating tickets.`)
    .addFields(
      { name: 'Reason', value: reason },
      { name: 'Blacklisted By', value: interaction.user.tag }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });

  logger.info(`User ${user.tag} blacklisted in ${interaction.guild.name} by ${interaction.user.tag}`);
}

/**
 * Handle blacklist remove
 */
async function handleRemove(interaction) {
  const user = interaction.options.getUser('user');

  const blacklist = await Blacklist.findOne({
    guildId: interaction.guild.id,
    userId: user.id,
    active: true
  });

  if (!blacklist) {
    return await interaction.reply({
      content: `❌ ${user.tag} is not blacklisted.`,
      ephemeral: true
    });
  }

  // Deactivate blacklist
  blacklist.active = false;
  await blacklist.save();

  const embed = new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle('✅ User Unblacklisted')
    .setDescription(`${user} has been removed from the blacklist.`)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });

  logger.info(`User ${user.tag} unblacklisted in ${interaction.guild.name} by ${interaction.user.tag}`);
}

/**
 * Handle blacklist list
 */
async function handleList(interaction) {
  const blacklists = await Blacklist.find({
    guildId: interaction.guild.id,
    active: true
  }).sort({ blacklistedAt: -1 });

  if (blacklists.length === 0) {
    return await interaction.reply({
      content: '📭 No users are currently blacklisted.',
      ephemeral: true
    });
  }

  const embed = new EmbedBuilder()
    .setColor(config.colors.warning)
    .setTitle('🚫 Blacklisted Users')
    .setDescription(`${blacklists.length} user(s) blacklisted:`)
    .setTimestamp();

  for (const blacklist of blacklists.slice(0, 10)) {
    embed.addFields({
      name: blacklist.username,
      value: [
        `**User ID:** ${blacklist.userId}`,
        `**Reason:** ${blacklist.reason}`,
        `**Date:** <t:${Math.floor(blacklist.blacklistedAt.getTime() / 1000)}:R>`
      ].join('\n'),
      inline: false
    });
  }

  if (blacklists.length > 10) {
    embed.setFooter({ text: `Showing 10 of ${blacklists.length} blacklisted users` });
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

/**
 * Handle blacklist check
 */
async function handleCheck(interaction) {
  const user = interaction.options.getUser('user');

  const blacklist = await Blacklist.getBlacklist(interaction.guild.id, user.id);

  if (!blacklist) {
    return await interaction.reply({
      content: `✅ ${user.tag} is not blacklisted.`,
      ephemeral: true
    });
  }

  const embed = new EmbedBuilder()
    .setColor(config.colors.error)
    .setTitle('🚫 User is Blacklisted')
    .setDescription(`${user} is currently blacklisted.`)
    .addFields(
      { name: 'Reason', value: blacklist.reason },
      { name: 'Blacklisted By', value: `<@${blacklist.blacklistedBy}>` },
      { name: 'Date', value: `<t:${Math.floor(blacklist.blacklistedAt.getTime() / 1000)}:R>` }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

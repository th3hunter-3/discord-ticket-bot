/**
 * Add User Command
 * Add a user to the current ticket
 */

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import Ticket from '../../models/Ticket.js';
import GuildConfig from '../../models/GuildConfig.js';

export default {
  data: new SlashCommandBuilder()
    .setName('add-user')
    .setDescription('Add a user to the current ticket')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to add')
        .setRequired(true)
    ),

  /**
   * Execute add-user command
   * @param {CommandInteraction} interaction - Command interaction
   */
  async execute(interaction) {
    const ticket = await Ticket.getByChannelId(interaction.channel.id);

    if (!ticket) {
      return await interaction.reply({
        content: '❌ This command can only be used in ticket channels.',
        ephemeral: true
      });
    }

    const guildConfig = await GuildConfig.getConfig(interaction.guild.id);
    const member = interaction.member;

    // Check if user is staff
    const isStaff = member.roles.cache.has(guildConfig.staffRoleId) ||
                   member.roles.cache.has(guildConfig.adminRoleId) ||
                   member.permissions.has('Administrator');

    if (!isStaff) {
      return await interaction.reply({
        content: '❌ Only staff members can use this command.',
        ephemeral: true
      });
    }

    const user = interaction.options.getUser('user');

    try {
      // Add user to channel permissions
      await interaction.channel.permissionOverwrites.create(user, {
        [PermissionFlagsBits.ViewChannel]: true,
        [PermissionFlagsBits.SendMessages]: true,
        [PermissionFlagsBits.ReadMessageHistory]: true,
        [PermissionFlagsBits.AttachFiles]: true
      });

      await interaction.reply({
        content: `✅ Added ${user} to the ticket.`
      });

    } catch (error) {
      await interaction.reply({
        content: '❌ Failed to add user to ticket.',
        ephemeral: true
      });
    }
  }
};

/**
 * Remove User Command
 * Remove a user from the current ticket
 */

import { SlashCommandBuilder } from 'discord.js';
import Ticket from '../../models/Ticket.js';
import GuildConfig from '../../models/GuildConfig.js';

export default {
  data: new SlashCommandBuilder()
    .setName('remove-user')
    .setDescription('Remove a user from the current ticket')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to remove')
        .setRequired(true)
    ),

  /**
   * Execute remove-user command
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

    // Prevent removing ticket owner
    if (user.id === ticket.userId) {
      return await interaction.reply({
        content: '❌ You cannot remove the ticket owner.',
        ephemeral: true
      });
    }

    try {
      // Remove user from channel permissions
      await interaction.channel.permissionOverwrites.delete(user);

      await interaction.reply({
        content: `✅ Removed ${user} from the ticket.`
      });

    } catch (error) {
      await interaction.reply({
        content: '❌ Failed to remove user from ticket.',
        ephemeral: true
      });
    }
  }
};

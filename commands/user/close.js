/**
 * Close Command
 * Close the current ticket
 */

import { SlashCommandBuilder } from 'discord.js';
import Ticket from '../../models/Ticket.js';
import GuildConfig from '../../models/GuildConfig.js';
import { closeTicket } from '../../utils/ticketHandler.js';

export default {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close the current ticket'),

  /**
   * Execute close command
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

    // Check permissions
    const isTicketOwner = ticket.userId === interaction.user.id;
    const isStaff = member.roles.cache.has(guildConfig.staffRoleId) ||
                   member.roles.cache.has(guildConfig.adminRoleId) ||
                   member.permissions.has('Administrator');

    if (!isTicketOwner && !isStaff) {
      return await interaction.reply({
        content: '❌ You do not have permission to close this ticket.',
        ephemeral: true
      });
    }

    await closeTicket(interaction, ticket, guildConfig);
  }
};

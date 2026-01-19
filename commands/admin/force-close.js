/**
 * Force Close Command
 * Force close a ticket
 */

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import Ticket from '../../models/Ticket.js';
import GuildConfig from '../../models/GuildConfig.js';
import { closeTicket } from '../../utils/ticketHandler.js';

export default {
  data: new SlashCommandBuilder()
    .setName('force-close')
    .setDescription('Force close the current ticket')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  permissions: [PermissionFlagsBits.Administrator],

  /**
   * Execute force-close command
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

    await closeTicket(interaction, ticket, guildConfig);
  }
};

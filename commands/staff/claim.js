/**
 * Claim Command
 * Claim the current ticket
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import Ticket from '../../models/Ticket.js';
import GuildConfig from '../../models/GuildConfig.js';
import config from '../../config.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('claim')
    .setDescription('Claim the current ticket'),

  /**
   * Execute claim command
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

    if (ticket.status === 'claimed') {
      return await interaction.reply({
        content: `❌ This ticket has already been claimed by <@${ticket.claimedBy}>.`,
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
        content: '❌ Only staff members can claim tickets.',
        ephemeral: true
      });
    }

    // Claim ticket
    ticket.status = 'claimed';
    ticket.claimedBy = interaction.user.id;
    ticket.claimedAt = new Date();
    await ticket.save();

    const embed = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setDescription(`✋ This ticket has been claimed by ${interaction.user}`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    logger.info(`Ticket #${ticket.ticketId} claimed by ${interaction.user.tag}`);
  }
};

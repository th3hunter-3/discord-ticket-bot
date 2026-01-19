/**
 * My Tickets Command
 * View user's open tickets
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import Ticket from '../../models/Ticket.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('my-tickets')
    .setDescription('View your open tickets'),

  /**
   * Execute my-tickets command
   * @param {CommandInteraction} interaction - Command interaction
   */
  async execute(interaction) {
    const tickets = await Ticket.find({
      guildId: interaction.guild.id,
      userId: interaction.user.id,
      status: { $in: ['open', 'claimed'] }
    }).sort({ createdAt: -1 });

    if (tickets.length === 0) {
      return await interaction.reply({
        content: '📭 You have no open tickets.',
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('🎫 Your Open Tickets')
      .setDescription(`You have ${tickets.length} open ticket(s):`)
      .setTimestamp();

    for (const ticket of tickets) {
      const status = ticket.status === 'claimed' ? '🟡 Claimed' : '🟢 Open';
      const channel = `<#${ticket.channelId}>`;
      
      embed.addFields({
        name: `Ticket #${ticket.ticketId}`,
        value: [
          `**Category:** ${ticket.category}`,
          `**Status:** ${status}`,
          `**Channel:** ${channel}`,
          `**Created:** <t:${Math.floor(ticket.createdAt.getTime() / 1000)}:R>`
        ].join('\n'),
        inline: true
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

/**
 * Reply Command
 * Reply to a modmail ticket
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import Ticket from '../../models/Ticket.js';
import GuildConfig from '../../models/GuildConfig.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('reply')
    .setDescription('Reply to a modmail ticket')
    .addStringOption(option =>
      option
        .setName('message')
        .setDescription('The message to send')
        .setRequired(true)
    ),

  /**
   * Execute reply command
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

    if (ticket.type !== 'modmail') {
      return await interaction.reply({
        content: '❌ This command can only be used in modmail tickets.',
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

    const message = interaction.options.getString('message');

    try {
      // Send message to user
      const user = await interaction.client.users.fetch(ticket.userId);

      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setAuthor({ name: `${interaction.user.tag} (Staff)`, iconURL: interaction.user.displayAvatarURL() })
        .setDescription(message)
        .setTimestamp()
        .setFooter({ text: `Ticket #${ticket.ticketId}` });

      await user.send({ embeds: [embed] });

      // Log in ticket channel
      const logEmbed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setDescription(`✅ Message sent to ${user.tag}`)
        .addFields({ name: 'Message', value: message })
        .setTimestamp();

      await interaction.reply({ embeds: [logEmbed] });

      // Update ticket activity
      ticket.lastActivityAt = new Date();
      ticket.messageCount += 1;
      await ticket.save();

    } catch (error) {
      await interaction.reply({
        content: '❌ Failed to send message. The user may have DMs disabled.',
        ephemeral: true
      });
    }
  }
};

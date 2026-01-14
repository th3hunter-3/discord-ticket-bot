/**
 * Setup Command
 * Interactive setup wizard for ticket system
 */

import { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits } from 'discord.js';
import GuildConfig from '../../models/GuildConfig.js';
import config from '../../config.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Set up the ticket system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  permissions: [PermissionFlagsBits.Administrator],

  /**
   * Execute setup command
   * @param {CommandInteraction} interaction - Command interaction
   */
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const guildConfig = await GuildConfig.getConfig(interaction.guild.id);

      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('🎫 Ticket System Setup')
        .setDescription('Setting up the ticket system for your server...')
        .setTimestamp();

      // Create ticket category
      let ticketCategory;
      if (guildConfig.ticketCategoryId) {
        try {
          ticketCategory = await interaction.guild.channels.fetch(guildConfig.ticketCategoryId);
        } catch (error) {
          ticketCategory = null;
        }
      }

      if (!ticketCategory) {
        ticketCategory = await interaction.guild.channels.create({
          name: '📂 Tickets',
          type: ChannelType.GuildCategory,
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              deny: [PermissionFlagsBits.ViewChannel]
            }
          ]
        });

        guildConfig.ticketCategoryId = ticketCategory.id;
        embed.addFields({ name: '✅ Ticket Category', value: `Created ${ticketCategory}` });
      } else {
        embed.addFields({ name: '✅ Ticket Category', value: `Using existing ${ticketCategory}` });
      }

      // Create ticket panel channel
      let ticketPanelChannel;
      if (guildConfig.ticketPanelChannelId) {
        try {
          ticketPanelChannel = await interaction.guild.channels.fetch(guildConfig.ticketPanelChannelId);
        } catch (error) {
          ticketPanelChannel = null;
        }
      }

      if (!ticketPanelChannel) {
        ticketPanelChannel = await interaction.guild.channels.create({
          name: '🎫-create-ticket',
          type: ChannelType.GuildText,
          topic: 'Click the button below to create a ticket',
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              deny: [PermissionFlagsBits.SendMessages],
              allow: [PermissionFlagsBits.ViewChannel]
            }
          ]
        });

        guildConfig.ticketPanelChannelId = ticketPanelChannel.id;
        embed.addFields({ name: '✅ Ticket Panel', value: `Created ${ticketPanelChannel}` });
      } else {
        embed.addFields({ name: '✅ Ticket Panel', value: `Using existing ${ticketPanelChannel}` });
      }

      // Create transcript log channel
      let transcriptLogChannel;
      if (guildConfig.transcriptLogChannelId) {
        try {
          transcriptLogChannel = await interaction.guild.channels.fetch(guildConfig.transcriptLogChannelId);
        } catch (error) {
          transcriptLogChannel = null;
        }
      }

      if (!transcriptLogChannel) {
        transcriptLogChannel = await interaction.guild.channels.create({
          name: '📝-ticket-logs',
          type: ChannelType.GuildText,
          topic: 'Ticket transcripts and logs',
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              deny: [PermissionFlagsBits.ViewChannel]
            }
          ]
        });

        guildConfig.transcriptLogChannelId = transcriptLogChannel.id;
        embed.addFields({ name: '✅ Transcript Log', value: `Created ${transcriptLogChannel}` });
      } else {
        embed.addFields({ name: '✅ Transcript Log', value: `Using existing ${transcriptLogChannel}` });
      }

      // Create modmail log channel
      let modmailLogChannel;
      if (guildConfig.modmailLogChannelId) {
        try {
          modmailLogChannel = await interaction.guild.channels.fetch(guildConfig.modmailLogChannelId);
        } catch (error) {
          modmailLogChannel = null;
        }
      }

      if (!modmailLogChannel) {
        modmailLogChannel = await interaction.guild.channels.create({
          name: '📬-modmail-logs',
          type: ChannelType.GuildText,
          topic: 'Modmail ticket logs',
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              deny: [PermissionFlagsBits.ViewChannel]
            }
          ]
        });

        guildConfig.modmailLogChannelId = modmailLogChannel.id;
        embed.addFields({ name: '✅ Modmail Log', value: `Created ${modmailLogChannel}` });
      } else {
        embed.addFields({ name: '✅ Modmail Log', value: `Using existing ${modmailLogChannel}` });
      }

      // Mark setup as complete
      guildConfig.setupComplete = true;
      await guildConfig.save();

      embed.addFields({
        name: '📌 Next Steps',
        value: [
          '1. Set staff role: Configure who can manage tickets',
          '2. Use `/panel` to create a ticket panel',
          '3. Users can also DM the bot to create modmail tickets',
          '4. Use `/lockdown enable` to prevent new tickets during maintenance'
        ].join('\n')
      });

      embed.setFooter({ text: 'Setup completed successfully!' });

      await interaction.editReply({ embeds: [embed] });

      logger.info(`Ticket system setup completed for guild ${interaction.guild.name} by ${interaction.user.tag}`);

    } catch (error) {
      logger.error('Error during setup:', error);
      await interaction.editReply({
        content: '❌ An error occurred during setup. Please try again.'
      });
    }
  }
};

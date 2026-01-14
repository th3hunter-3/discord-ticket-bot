/**
 * Setup Command
 * Interactive setup wizard for ticket system with role and admin configuration
 */

import { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits, ComponentType } from 'discord.js';
import GuildConfig from '../../models/GuildConfig.js';
import config from '../../config.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Set up the ticket system with complete configuration')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption(option =>
      option.setName('staff-role')
        .setDescription('Role for staff members who can manage tickets')
        .setRequired(false))
    .addRoleOption(option =>
      option.setName('admin-role')
        .setDescription('Role for administrators')
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('max-tickets')
        .setDescription('Maximum open tickets per user (default: 3)')
        .setMinValue(1)
        .setMaxValue(10)
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('rate-limit')
        .setDescription('Max tickets per hour (default: 5)')
        .setMinValue(1)
        .setMaxValue(20)
        .setRequired(false)),

  permissions: [PermissionFlagsBits.Administrator],

  /**
   * Execute setup command
   * @param {CommandInteraction} interaction - Command interaction
   */
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const staffRole = interaction.options.getRole('staff-role');
      const adminRole = interaction.options.getRole('admin-role');
      const maxTickets = interaction.options.getInteger('max-tickets') || 3;
      const rateLimit = interaction.options.getInteger('rate-limit') || 5;

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
            },
            ...(staffRole ? [{
              id: staffRole.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages]
            }] : []),
            ...(adminRole ? [{
              id: adminRole.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ManageChannels]
            }] : [])
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
            },
            ...(staffRole ? [{
              id: staffRole.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
            }] : []),
            ...(adminRole ? [{
              id: adminRole.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages]
            }] : [])
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
            },
            ...(staffRole ? [{
              id: staffRole.id,
              allow: [PermissionFlagsBits.ViewChannel]
            }] : []),
            ...(adminRole ? [{
              id: adminRole.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageMessages]
            }] : [])
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
            },
            ...(staffRole ? [{
              id: staffRole.id,
              allow: [PermissionFlagsBits.ViewChannel]
            }] : []),
            ...(adminRole ? [{
              id: adminRole.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageMessages]
            }] : [])
          ]
        });

        guildConfig.modmailLogChannelId = modmailLogChannel.id;
        embed.addFields({ name: '✅ Modmail Log', value: `Created ${modmailLogChannel}` });
      } else {
        embed.addFields({ name: '✅ Modmail Log', value: `Using existing ${modmailLogChannel}` });
      }

      // Set staff and admin roles
      if (staffRole) {
        guildConfig.staffRoleId = staffRole.id;
        embed.addFields({ name: '👮 Staff Role', value: `${staffRole}` });
      }

      if (adminRole) {
        guildConfig.adminRoleId = adminRole.id;
        embed.addFields({ name: '🛡️ Admin Role', value: `${adminRole}` });
      }

      // Set limits
      guildConfig.maxOpenTickets = maxTickets;
      guildConfig.rateLimitEnabled = true;
      guildConfig.rateLimitMax = rateLimit;
      guildConfig.rateLimitWindow = 3600000; // 1 hour

      embed.addFields({
        name: '⚙️ Configuration',
        value: [
          `**Max Open Tickets:** ${maxTickets} per user`,
          `**Rate Limit:** ${rateLimit} tickets per hour`,
          `**Staff Role:** ${staffRole ? `<@&${staffRole.id}>` : 'Not set'}`,
          `**Admin Role:** ${adminRole ? `<@&${adminRole.id}>` : 'Not set'}`
        ].join('\n')
      });

      // Mark setup as complete
      guildConfig.setupComplete = true;
      await guildConfig.save();

      embed.addFields({
        name: '📌 Next Steps',
        value: [
          '1. Use `/panel` to create a ticket panel in the ticket channel',
          '2. Users can click the button to create tickets',
          '3. Users can also DM the bot to create modmail tickets',
          '4. Use `/lockdown enable` to prevent new tickets during maintenance',
          '5. Use `/automod enable #channel` to enable auto-moderation (optional)',
          '6. Configure roles with `/setup` again if needed'
        ].join('\n')
      });

      embed.setFooter({ text: 'Setup completed successfully! Your ticket system is ready.' });

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

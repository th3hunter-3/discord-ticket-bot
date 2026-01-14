/**
 * Panel Command
 * Create ticket panel with button
 */

import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import GuildConfig from '../../models/GuildConfig.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Create a ticket panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('Channel to send the panel (defaults to ticket panel channel)')
        .setRequired(false)
    ),

  permissions: [PermissionFlagsBits.Administrator],

  /**
   * Execute panel command
   * @param {CommandInteraction} interaction - Command interaction
   */
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const guildConfig = await GuildConfig.getConfig(interaction.guild.id);

      if (!guildConfig.setupComplete) {
        return await interaction.editReply({
          content: '❌ Please run `/setup` first to configure the ticket system.'
        });
      }

      const targetChannel = interaction.options.getChannel('channel') || 
                           await interaction.guild.channels.fetch(guildConfig.ticketPanelChannelId);

      if (!targetChannel) {
        return await interaction.editReply({
          content: '❌ Could not find target channel. Please run `/setup` again.'
        });
      }

      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('🎫 Support Ticket System')
        .setDescription([
          '**Need help? Create a ticket!**',
          '',
          'Click the button below to open a support ticket.',
          'A staff member will assist you as soon as possible.',
          '',
          '**Available Categories:**',
          ...config.tickets.categories.map(cat => `${cat.emoji} **${cat.name}** - ${cat.description}`),
          '',
          '**Alternative:** You can also DM me to create a modmail ticket!'
        ].join('\n'))
        .setFooter({ text: 'Tickets are private and only visible to you and staff' })
        .setTimestamp();

      const button = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_create')
          .setLabel('Create Ticket')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🎫')
      );

      const message = await targetChannel.send({
        embeds: [embed],
        components: [button]
      });

      // Save panel message ID
      guildConfig.ticketPanelMessageId = message.id;
      await guildConfig.save();

      await interaction.editReply({
        content: `✅ Ticket panel created in ${targetChannel}!`
      });

    } catch (error) {
      await interaction.editReply({
        content: '❌ Failed to create ticket panel. Make sure I have permission to send messages in that channel.'
      });
    }
  }
};

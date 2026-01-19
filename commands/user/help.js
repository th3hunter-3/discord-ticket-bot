/**
 * Help Command
 * Displays help information based on user permissions
 */

import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import config from '../../config.js';
import GuildConfig from '../../models/GuildConfig.js';

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('View help information and available commands'),

  /**
   * Execute help command
   * @param {CommandInteraction} interaction - Command interaction
   */
  async execute(interaction) {
    const ownerIds = process.env.OWNER_IDS?.split(',') || [];
    const isOwner = ownerIds.includes(interaction.user.id);
    
    // Check if user is admin
    const isAdmin = interaction.member?.permissions?.has(PermissionFlagsBits.Administrator) || isOwner;
    
    // Check if user is staff
    let isStaff = false;
    if (interaction.guild) {
      const guildConfig = await GuildConfig.getConfig(interaction.guild.id);
      if (guildConfig.staffRoleId) {
        isStaff = interaction.member?.roles?.cache.has(guildConfig.staffRoleId);
      }
    }
    isStaff = isStaff || isAdmin;

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('🎫 Discord Ticket Bot - Help')
      .setDescription('Here are the commands available to you:')
      .setTimestamp();

    // User commands - always shown
    embed.addFields({
      name: '👤 User Commands',
      value: [
        '`/help` - Show this help message',
        '`/my-tickets` - View your open tickets',
        '`/close` - Close your ticket (use in ticket channel)'
      ].join('\n')
    });

    // Staff commands - only if user is staff
    if (isStaff) {
      embed.addFields({
        name: '👮 Staff Commands',
        value: [
          '`/reply <message>` - Reply to a modmail ticket',
          '`/add-user <user>` - Add a user to the current ticket',
          '`/remove-user <user>` - Remove a user from the current ticket',
          '`/claim` - Claim a ticket'
        ].join('\n')
      });
    }

    // Admin commands - only if user is admin
    if (isAdmin) {
      embed.addFields({
        name: '🛡️ Admin Commands',
        value: [
          '`/setup` - Run the interactive setup wizard with role configuration',
          '`/panel` - Create a ticket panel',
          '`/blacklist add/remove/list/check` - Manage user blacklist',
          '`/force-close` - Force close the current ticket',
          '`/lockdown enable/disable/status` - Manage lockdown mode',
          '`/automod enable/disable/config/status` - Configure auto-moderation'
        ].join('\n')
      });
    }

    // Owner commands - only if user is owner
    if (isOwner) {
      embed.addFields({
        name: '👑 Owner Commands',
        value: [
          '`/eval <code>` - Evaluate JavaScript code (dangerous)',
          '`/restart` - Restart the bot',
          '`/reload-commands` - Reload all commands',
          '`/whitelist add/remove/list/mode` - Manage guild whitelist',
          '`/health` - View bot health and performance metrics'
        ].join('\n')
      });
    }

    embed.setFooter({ 
      text: isOwner ? 'Owner Access | Full Permissions' : 
            isAdmin ? 'Administrator Access' :
            isStaff ? 'Staff Access' : 'User Access'
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

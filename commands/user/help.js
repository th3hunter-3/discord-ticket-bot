/**
 * Help Command
 * Displays help information
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import config from '../../config.js';

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

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('🎫 Discord Ticket Bot - Help')
      .setDescription('Here are all the available commands:')
      .addFields(
        {
          name: '👤 User Commands',
          value: [
            '`/help` - Show this help message',
            '`/my-tickets` - View your open tickets',
            '`/close` - Close your ticket (use in ticket channel)'
          ].join('\n')
        },
        {
          name: '👮 Staff Commands',
          value: [
            '`/reply <message>` - Reply to a modmail ticket',
            '`/add-user <user>` - Add a user to the current ticket',
            '`/remove-user <user>` - Remove a user from the current ticket',
            '`/claim` - Claim a ticket'
          ].join('\n')
        },
        {
          name: '🛡️ Admin Commands',
          value: [
            '`/setup` - Run the interactive setup wizard',
            '`/blacklist <user> <reason>` - Blacklist a user from tickets',
            '`/unblacklist <user>` - Remove user from blacklist',
            '`/force-close` - Force close the current ticket',
            '`/lockdown <enable/disable>` - Toggle lockdown mode',
            '`/panel` - Create a ticket panel'
          ].join('\n')
        }
      )
      .setFooter({ text: 'Use buttons in ticket panel to create tickets or DM me!' })
      .setTimestamp();

    if (isOwner) {
      embed.addFields({
        name: '👑 Owner Commands',
        value: [
          '`/eval <code>` - Evaluate JavaScript code (dangerous)',
          '`/restart` - Restart the bot',
          '`/reload-commands` - Reload all commands'
        ].join('\n')
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

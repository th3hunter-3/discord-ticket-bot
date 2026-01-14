/**
 * Message Create Event
 * Handles modmail DMs, ticket messages, and auto-moderation
 */

import logger from '../utils/logger.js';
import Ticket from '../models/Ticket.js';
import GuildConfig from '../models/GuildConfig.js';
import Blacklist from '../models/Blacklist.js';
import rateLimiter from '../utils/rateLimiter.js';
import autoMod from '../services/AutoModService.js';
import healthMonitor from '../services/HealthMonitor.js';
import { EmbedBuilder } from 'discord.js';
import config from '../config.js';

export default {
  name: 'messageCreate',
  
  /**
   * Execute message create event
   * @param {Message} message - Discord message
   */
  async execute(message) {
    // Ignore bot messages
    if (message.author.bot) return;

    // Handle DM messages (Modmail)
    if (message.channel.type === 1) { // DM Channel
      await handleModmail(message);
    }
    
    // Handle guild messages
    else if (message.guild) {
      // Run auto-moderation first
      const guildConfig = await GuildConfig.getConfig(message.guild.id);
      
      if (guildConfig.autoMod?.enabled) {
        const modResult = await autoMod.checkMessage(message, guildConfig);
        
        if (!modResult.pass) {
          await autoMod.executeAction(message, modResult, guildConfig);
          healthMonitor.recordAutoModAction();
          return; // Stop processing if message violated rules
        }
      }
      
      // Handle ticket channel messages
      await handleTicketMessage(message);
    }
  }
};

/**
 * Handle modmail DMs
 * @param {Message} message - DM message
 */
async function handleModmail(message) {
  try {
    const client = message.client;
    
    // Get all guilds the bot and user share
    // Use fetch instead of cache to ensure we get accurate member data
    const mutualGuilds = [];
    for (const [guildId, guild] of client.guilds.cache) {
      try {
        // Try to fetch the member from this guild
        await guild.members.fetch(message.author.id);
        mutualGuilds.push(guild);
      } catch (error) {
        // User is not in this guild, continue
        continue;
      }
    }

    if (mutualGuilds.length === 0) {
      return await message.reply('❌ You must be in a server with me to use modmail.');
    }

    // For simplicity, use the first mutual guild
    const guild = mutualGuilds[0];
    const guildConfig = await GuildConfig.getConfig(guild.id);

    // Check if modmail is enabled
    if (!guildConfig.modmailEnabled) {
      return await message.reply('❌ Modmail is not enabled in this server.');
    }

    // Check if setup is complete
    if (!guildConfig.setupComplete || !guildConfig.modmailLogChannelId) {
      return await message.reply('❌ Modmail has not been set up yet. Please contact an administrator.');
    }

    // Check blacklist
    const isBlacklisted = await Blacklist.isBlacklisted(guild.id, message.author.id);
    if (isBlacklisted) {
      return await message.reply('❌ You have been blacklisted from creating tickets.');
    }

    // Check for existing open modmail ticket
    const existingTicket = await Ticket.findOne({
      userId: message.author.id,
      guildId: guild.id,
      type: 'modmail',
      status: { $in: ['open', 'claimed'] }
    });

    if (existingTicket) {
      // Forward message to existing ticket
      const ticketChannel = await guild.channels.fetch(existingTicket.channelId);
      
      if (ticketChannel) {
        const embed = new EmbedBuilder()
          .setColor(config.colors.info)
          .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
          .setDescription(message.content || '*No content*')
          .setTimestamp();

        if (message.attachments.size > 0) {
          const attachments = Array.from(message.attachments.values());
          embed.addFields({
            name: '📎 Attachments',
            value: attachments.map(a => `[${a.name}](${a.url})`).join('\n')
          });
        }

        await ticketChannel.send({ embeds: [embed] });
        
        // Update ticket activity
        existingTicket.lastActivityAt = new Date();
        existingTicket.messageCount += 1;
        await existingTicket.save();

        await message.reply('✅ Your message has been sent to the staff team.');
      }
    } else {
      // Check rate limit before creating new modmail ticket
      if (guildConfig.rateLimitEnabled) {
        const rateLimit = rateLimiter.check(
          message.author.id,
          guildConfig.rateLimitMax,
          guildConfig.rateLimitWindow
        );

        if (rateLimit.limited) {
          const resetTime = Math.floor(rateLimit.resetAt.getTime() / 1000);
          return await message.reply(`❌ You are creating tickets too quickly. Please try again <t:${resetTime}:R>.`);
        }
      }

      // Create new modmail ticket
      await message.reply('📬 Opening a new ticket...');
      
      const { createModmailTicket } = await import('../utils/ticketHandler.js');
      await createModmailTicket(message, guild, guildConfig);
    }

  } catch (error) {
    logger.error('Error handling modmail:', error);
    await message.reply('❌ An error occurred while processing your message.').catch(() => {});
  }
}

/**
 * Handle messages in ticket channels
 * @param {Message} message - Ticket message
 */
async function handleTicketMessage(message) {
  try {
    // Check if message is in a ticket channel
    const ticket = await Ticket.getByChannelId(message.channel.id);
    
    if (!ticket) return;

    // Update ticket activity
    ticket.lastActivityAt = new Date();
    ticket.messageCount += 1;
    await ticket.save();

    // If it's a modmail ticket and staff is replying
    if (ticket.type === 'modmail') {
      const guildConfig = await GuildConfig.getConfig(message.guild.id);
      const member = message.member;
      
      // Check if user is staff
      const isStaff = member.roles.cache.has(guildConfig.staffRoleId) || 
                     member.roles.cache.has(guildConfig.adminRoleId) ||
                     member.permissions.has('Administrator');

      if (isStaff) {
        // Forward staff reply to user DM
        try {
          const user = await message.client.users.fetch(ticket.userId);
          
          const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setAuthor({ name: `${message.author.tag} (Staff)`, iconURL: message.author.displayAvatarURL() })
            .setDescription(message.content || '*No content*')
            .setTimestamp()
            .setFooter({ text: `Ticket #${ticket.ticketId}` });

          if (message.attachments.size > 0) {
            const attachments = Array.from(message.attachments.values());
            embed.addFields({
              name: '📎 Attachments',
              value: attachments.map(a => `[${a.name}](${a.url})`).join('\n')
            });
          }

          await user.send({ embeds: [embed] });
          await message.react('✅');
          
        } catch (error) {
          logger.error('Error forwarding message to user:', error);
          await message.reply('❌ Failed to send message to user. They may have DMs disabled.').catch(() => {});
        }
      }
    }

  } catch (error) {
    logger.error('Error handling ticket message:', error);
  }
}

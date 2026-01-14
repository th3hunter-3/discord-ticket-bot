/**
 * Ticket Handler Utility
 * Core ticket system logic
 */

import {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder
} from 'discord.js';
import logger from './logger.js';
import Ticket from '../models/Ticket.js';
import GuildConfig from '../models/GuildConfig.js';
import Blacklist from '../models/Blacklist.js';
import rateLimiter from './rateLimiter.js';
import { generateTranscript, saveTranscript, generatePDFTranscript } from './transcript.js';
import { sanitizeInput } from './sanitizer.js';
import config from '../config.js';

/**
 * Handle ticket button click
 * @param {ButtonInteraction} interaction - Button interaction
 * @param {Array} args - Button arguments
 */
export async function handleTicketButton(interaction, args) {
  try {
    const action = args[0];

    if (action === 'create') {
      // Show category selection
      await showTicketCategorySelect(interaction);
    }
  } catch (error) {
    logger.error('Error handling ticket button:', error);
    throw error;
  }
}

/**
 * Show ticket category selection
 * @param {Interaction} interaction - Interaction
 */
async function showTicketCategorySelect(interaction) {
  const guildConfig = await GuildConfig.getConfig(interaction.guild.id);

  // Check if setup is complete
  if (!guildConfig.setupComplete) {
    return await interaction.reply({
      content: '❌ Ticket system has not been set up yet. Please contact an administrator.',
      ephemeral: true
    });
  }

  // Check blacklist
  const isBlacklisted = await Blacklist.isBlacklisted(interaction.guild.id, interaction.user.id);
  if (isBlacklisted) {
    return await interaction.reply({
      content: '❌ You have been blacklisted from creating tickets.',
      ephemeral: true
    });
  }

  // Check lockdown mode
  if (guildConfig.lockdownMode) {
    return await interaction.reply({
      content: `🔒 Ticket creation is currently disabled.\n**Reason:** ${guildConfig.lockdownReason || 'Maintenance'}`,
      ephemeral: true
    });
  }

  // Check open tickets limit
  const openTickets = await Ticket.getUserOpenTickets(interaction.guild.id, interaction.user.id);
  if (openTickets >= guildConfig.maxOpenTickets) {
    return await interaction.reply({
      content: `❌ You already have ${openTickets} open ticket(s). Please close them before opening a new one.`,
      ephemeral: true
    });
  }

  // Check rate limit
  if (guildConfig.rateLimitEnabled) {
    const rateLimit = rateLimiter.check(
      interaction.user.id,
      guildConfig.rateLimitMax,
      guildConfig.rateLimitWindow
    );

    if (rateLimit.limited) {
      const resetTime = Math.floor(rateLimit.resetAt.getTime() / 1000);
      return await interaction.reply({
        content: `❌ You are creating tickets too quickly. Please try again <t:${resetTime}:R>.`,
        ephemeral: true
      });
    }
  }

  // Create select menu for categories
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('ticket_category')
    .setPlaceholder('Select a ticket category')
    .addOptions(
      config.tickets.categories.map(category => ({
        label: category.name,
        value: category.id,
        description: category.description,
        emoji: category.emoji
      }))
    );

  const row = new ActionRowBuilder().addComponents(selectMenu);

  await interaction.reply({
    content: '🎫 Please select a category for your ticket:',
    components: [row],
    ephemeral: true
  });
}

/**
 * Handle ticket category selection
 * @param {StringSelectMenuInteraction} interaction - Select menu interaction
 * @param {Array} args - Arguments
 */
export async function handleTicketSelect(interaction, args) {
  try {
    const action = args[0];

    if (action === 'category') {
      const category = interaction.values[0];
      await showTicketModal(interaction, category);
    }
  } catch (error) {
    logger.error('Error handling ticket select:', error);
    throw error;
  }
}

/**
 * Show ticket modal
 * @param {Interaction} interaction - Interaction
 * @param {string} category - Ticket category
 */
async function showTicketModal(interaction, category) {
  const categoryInfo = config.tickets.categories.find(c => c.id === category);

  const modal = new ModalBuilder()
    .setCustomId(`ticket_create_${category}`)
    .setTitle(`Open ${categoryInfo?.name || 'Ticket'}`);

  const subjectInput = new TextInputBuilder()
    .setCustomId('subject')
    .setLabel('Subject')
    .setPlaceholder('Brief description of your issue')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setRequired(true);

  const descriptionInput = new TextInputBuilder()
    .setCustomId('description')
    .setLabel('Description')
    .setPlaceholder('Provide detailed information about your issue')
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000)
    .setRequired(true);

  const row1 = new ActionRowBuilder().addComponents(subjectInput);
  const row2 = new ActionRowBuilder().addComponents(descriptionInput);

  modal.addComponents(row1, row2);

  await interaction.showModal(modal);
}

/**
 * Handle ticket modal submission
 * @param {ModalSubmitInteraction} interaction - Modal interaction
 * @param {Array} args - Arguments
 */
export async function handleTicketModal(interaction, args) {
  try {
    const action = args[0];
    const category = args[1];

    if (action === 'create') {
      await createTicket(interaction, category);
    }
  } catch (error) {
    logger.error('Error handling ticket modal:', error);
    throw error;
  }
}

/**
 * Create a new ticket
 * @param {ModalSubmitInteraction} interaction - Modal interaction
 * @param {string} category - Ticket category
 */
async function createTicket(interaction, category) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const subject = sanitizeInput(interaction.fields.getTextInputValue('subject'));
    const description = sanitizeInput(interaction.fields.getTextInputValue('description'));

    const guildConfig = await GuildConfig.getConfig(interaction.guild.id);
    const categoryInfo = config.tickets.categories.find(c => c.id === category);

    // Get next ticket ID
    const ticketId = await Ticket.getNextTicketId(interaction.guild.id);

    // Create ticket channel
    const channelName = `ticket-${ticketId}`;
    const ticketChannel = await interaction.guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: guildConfig.ticketCategoryId,
      topic: `${categoryInfo?.emoji || '🎫'} Ticket #${ticketId} | ${interaction.user.tag} | ${category}`,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles
          ]
        },
        ...(guildConfig.staffRoleId ? [{
          id: guildConfig.staffRoleId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageMessages
          ]
        }] : [])
      ]
    });

    // Save ticket to database
    const ticket = await Ticket.create({
      ticketId,
      guildId: interaction.guild.id,
      channelId: ticketChannel.id,
      userId: interaction.user.id,
      username: interaction.user.tag,
      category,
      subject,
      description,
      type: 'server',
      status: 'open'
    });

    // Send welcome message
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`${categoryInfo?.emoji || '🎫'} Ticket #${ticketId}`)
      .setDescription(`**Subject:** ${subject}\n\n**Description:**\n${description}`)
      .addFields(
        { name: 'Category', value: categoryInfo?.name || category, inline: true },
        { name: 'Status', value: '🟢 Open', inline: true }
      )
      .setFooter({ text: 'A staff member will be with you shortly' })
      .setTimestamp();

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒'),
      new ButtonBuilder()
        .setCustomId('claim_ticket')
        .setLabel('Claim')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('✋')
    );

    await ticketChannel.send({
      content: `${interaction.user} | ${guildConfig.staffRoleId ? `<@&${guildConfig.staffRoleId}>` : 'Staff'}`,
      embeds: [embed],
      components: [buttons]
    });

    logger.info(`Ticket #${ticketId} created by ${interaction.user.tag} in ${interaction.guild.name}`);

    await interaction.editReply({
      content: `✅ Ticket created! ${ticketChannel}`
    });

  } catch (error) {
    logger.error('Error creating ticket:', error);
    await interaction.editReply({
      content: '❌ Failed to create ticket. Please try again later.'
    });
  }
}

/**
 * Create modmail ticket
 * @param {Message} message - DM message
 * @param {Guild} guild - Guild
 * @param {Object} guildConfig - Guild config
 */
export async function createModmailTicket(message, guild, guildConfig) {
  try {
    // Get next ticket ID
    const ticketId = await Ticket.getNextTicketId(guild.id);

    // Create ticket channel
    const channelName = `modmail-${message.author.username}-${ticketId}`;
    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: guildConfig.ticketCategoryId,
      topic: `📬 Modmail #${ticketId} | ${message.author.tag}`,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        ...(guildConfig.staffRoleId ? [{
          id: guildConfig.staffRoleId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageMessages
          ]
        }] : [])
      ]
    });

    // Save ticket to database
    const ticket = await Ticket.create({
      ticketId,
      guildId: guild.id,
      channelId: ticketChannel.id,
      userId: message.author.id,
      username: message.author.tag,
      category: 'modmail',
      description: message.content,
      type: 'modmail',
      status: 'open'
    });

    // Send initial message
    const embed = new EmbedBuilder()
      .setColor(config.colors.info)
      .setTitle(`📬 Modmail Ticket #${ticketId}`)
      .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
      .setDescription(message.content || '*No content*')
      .addFields(
        { name: 'User ID', value: message.author.id, inline: true },
        { name: 'Status', value: '🟢 Open', inline: true }
      )
      .setTimestamp();

    if (message.attachments.size > 0) {
      const attachments = Array.from(message.attachments.values());
      embed.addFields({
        name: '📎 Attachments',
        value: attachments.map(a => `[${a.name}](${a.url})`).join('\n')
      });
    }

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒'),
      new ButtonBuilder()
        .setCustomId('claim_ticket')
        .setLabel('Claim')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('✋')
    );

    await ticketChannel.send({
      content: guildConfig.staffRoleId ? `<@&${guildConfig.staffRoleId}>` : '@here',
      embeds: [embed],
      components: [buttons]
    });

    logger.info(`Modmail ticket #${ticketId} created by ${message.author.tag} in ${guild.name}`);

    await message.reply(`✅ Your ticket (#${ticketId}) has been created! A staff member will respond shortly.`);

  } catch (error) {
    logger.error('Error creating modmail ticket:', error);
    await message.reply('❌ Failed to create ticket. Please try again later.').catch(() => {});
  }
}

/**
 * Handle close button
 * @param {ButtonInteraction} interaction - Button interaction
 */
export async function handleCloseButton(interaction) {
  try {
    const ticket = await Ticket.getByChannelId(interaction.channel.id);

    if (!ticket) {
      return await interaction.reply({
        content: '❌ This is not a valid ticket channel.',
        ephemeral: true
      });
    }

    const guildConfig = await GuildConfig.getConfig(interaction.guild.id);
    const member = interaction.member;

    // Check permissions
    const isTicketOwner = ticket.userId === interaction.user.id;
    const isStaff = member.roles.cache.has(guildConfig.staffRoleId) ||
                   member.roles.cache.has(guildConfig.adminRoleId) ||
                   member.permissions.has('Administrator');

    if (!isTicketOwner && !isStaff) {
      return await interaction.reply({
        content: '❌ You do not have permission to close this ticket.',
        ephemeral: true
      });
    }

    await closeTicket(interaction, ticket, guildConfig);

  } catch (error) {
    logger.error('Error handling close button:', error);
    await interaction.reply({
      content: '❌ An error occurred while closing the ticket.',
      ephemeral: true
    });
  }
}

/**
 * Handle claim button
 * @param {ButtonInteraction} interaction - Button interaction
 */
export async function handleClaimButton(interaction) {
  try {
    const ticket = await Ticket.getByChannelId(interaction.channel.id);

    if (!ticket) {
      return await interaction.reply({
        content: '❌ This is not a valid ticket channel.',
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

  } catch (error) {
    logger.error('Error handling claim button:', error);
    await interaction.reply({
      content: '❌ An error occurred while claiming the ticket.',
      ephemeral: true
    });
  }
}

/**
 * Close a ticket
 * @param {Interaction} interaction - Interaction
 * @param {Object} ticket - Ticket object
 * @param {Object} guildConfig - Guild config
 */
export async function closeTicket(interaction, ticket, guildConfig) {
  await interaction.reply('🔒 Closing ticket...');

  try {
    // Fetch messages for transcript
    const messages = [];
    let lastId;

    while (true) {
      const options = { limit: 100 };
      if (lastId) options.before = lastId;

      const fetchedMessages = await interaction.channel.messages.fetch(options);
      messages.push(...fetchedMessages.values());

      if (fetchedMessages.size < 100) break;
      lastId = fetchedMessages.last().id;
    }

    messages.reverse();

    // Generate transcript
    let transcriptPath = null;
    let pdfPath = null;
    if (guildConfig.transcriptEnabled) {
      const html = await generateTranscript(messages, ticket, interaction.guild);
      transcriptPath = await saveTranscript(html, ticket.ticketId);
      
      // Generate PDF transcript
      try {
        pdfPath = await generatePDFTranscript(html, ticket.ticketId);
        logger.info(`PDF transcript generated for ticket #${ticket.ticketId}`);
      } catch (error) {
        logger.error('PDF generation failed, using HTML only:', error);
        pdfPath = null;
      }

      // Send transcript to log channel (prefer PDF, fallback to HTML)
      if (guildConfig.transcriptLogChannelId) {
        try {
          const logChannel = await interaction.guild.channels.fetch(guildConfig.transcriptLogChannelId);
          
          const logEmbed = new EmbedBuilder()
            .setColor(config.colors.info)
            .setTitle(`${config.emojis.transcript} Ticket Closed - #${ticket.ticketId}`)
            .addFields(
              { name: 'User', value: `<@${ticket.userId}>`, inline: true },
              { name: 'Category', value: ticket.category, inline: true },
              { name: 'Closed By', value: `<@${interaction.user.id}>`, inline: true },
              { name: 'Messages', value: ticket.messageCount.toString(), inline: true },
              { name: 'Opened', value: `<t:${Math.floor(ticket.createdAt.getTime() / 1000)}:R>`, inline: true },
              { name: 'Closed', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
            );

          const files = [];
          if (pdfPath) {
            files.push({ attachment: pdfPath, name: `ticket-${ticket.ticketId}.pdf` });
          }
          if (transcriptPath) {
            files.push({ attachment: transcriptPath, name: `ticket-${ticket.ticketId}.html` });
          }

          await logChannel.send({
            embeds: [logEmbed],
            files
          });
        } catch (error) {
          logger.error('Error sending transcript to log channel:', error);
        }
      }

      // DM transcript to user (prefer PDF, fallback to HTML)
      if (guildConfig.dmTranscriptEnabled) {
        try {
          const user = await interaction.client.users.fetch(ticket.userId);
          
          const dmEmbed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle(`${config.emojis.transcript} Ticket #${ticket.ticketId} - Transcript`)
            .setDescription(`Your ticket has been closed. Here is a ${pdfPath ? 'PDF' : 'HTML'} transcript of the conversation.`)
            .addFields(
              { name: 'Server', value: interaction.guild.name, inline: true },
              { name: 'Category', value: ticket.category, inline: true },
              { name: 'Format', value: pdfPath ? '📄 PDF' : '📝 HTML', inline: true }
            )
            .setTimestamp();

          const files = [];
          if (pdfPath) {
            files.push({ attachment: pdfPath, name: `ticket-${ticket.ticketId}.pdf` });
          } else if (transcriptPath) {
            files.push({ attachment: transcriptPath, name: `ticket-${ticket.ticketId}.html` });
          }

          await user.send({
            embeds: [dmEmbed],
            files
          });
        } catch (error) {
          logger.error('Error DMing transcript to user:', error);
        }
      }
    }

    // Update ticket in database
    ticket.status = 'closed';
    ticket.closedAt = new Date();
    ticket.closedBy = interaction.user.id;
    ticket.transcriptUrl = pdfPath || transcriptPath;
    await ticket.save();

    // Delete channel after delay
    await interaction.channel.send('🔒 This ticket will be deleted in 5 seconds...');
    
    setTimeout(async () => {
      try {
        await interaction.channel.delete();
      } catch (error) {
        logger.error('Error deleting ticket channel:', error);
      }
    }, 5000);

    logger.info(`Ticket #${ticket.ticketId} closed by ${interaction.user.tag}`);

  } catch (error) {
    logger.error('Error closing ticket:', error);
    await interaction.followUp('❌ An error occurred while closing the ticket.');
  }
}

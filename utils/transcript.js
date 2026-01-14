/**
 * Enhanced Transcript Generator Utility
 * Generates professional PDF transcripts with detailed metadata
 */

import { sanitizeForHTML } from './sanitizer.js';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import logger from './logger.js';

/**
 * Generate enhanced HTML transcript from messages
 * @param {Array} messages - Array of message objects
 * @param {Object} ticket - Ticket object
 * @param {Object} guild - Discord guild
 * @param {Object} participants - Participant metadata
 * @returns {Promise<string>} HTML transcript
 */
export async function generateTranscript(messages, ticket, guild, participants = {}) {
  try {
    // Calculate participant statistics
    const participantStats = {};
    const participantRoles = {};
    
    for (const msg of messages) {
      const userId = msg.author.id;
      if (!participantStats[userId]) {
        participantStats[userId] = {
          username: msg.author.username,
          tag: msg.author.tag,
          avatar: msg.author.displayAvatarURL() || 'https://cdn.discordapp.com/embed/avatars/0.png',
          messageCount: 0,
          role: 'User'
        };
      }
      participantStats[userId].messageCount++;
      
      // Determine role
      if (participants[userId]) {
        participantRoles[userId] = participants[userId];
      }
    }

    // Generate participants HTML
    const participantsHtml = Object.entries(participantStats).map(([userId, stats]) => {
      const role = participantRoles[userId] || 'User';
      const roleClass = role.toLowerCase().replace(/\s+/g, '-');
      
      return `
        <div class="participant">
          <img class="participant-avatar" src="${stats.avatar}" alt="${stats.username}">
          <div class="participant-info">
            <span class="participant-name">${sanitizeForHTML(stats.username)}</span>
            <span class="participant-role ${roleClass}">${role}</span>
            <span class="participant-messages">${stats.messageCount} messages</span>
          </div>
        </div>
      `;
    }).join('\n');

    // Generate action timeline
    const timelineEvents = [];
    
    // Opened
    const opener = participantStats[ticket.userId];
    timelineEvents.push(`
      <div class="timeline-event">
        <span class="timeline-icon">📂</span>
        <span class="timeline-text">Opened by <strong>${sanitizeForHTML(opener?.username || 'Unknown')}</strong> on ${new Date(ticket.createdAt).toLocaleString()}</span>
      </div>
    `);
    
    // Claimed
    if (ticket.claimedBy && ticket.claimedAt) {
      const claimer = participantStats[ticket.claimedBy];
      timelineEvents.push(`
        <div class="timeline-event">
          <span class="timeline-icon">✋</span>
          <span class="timeline-text">Claimed by <strong>${sanitizeForHTML(claimer?.username || 'Unknown')}</strong> on ${new Date(ticket.claimedAt).toLocaleString()}</span>
        </div>
      `);
    }
    
    // Closed
    if (ticket.closedBy && ticket.closedAt) {
      const closer = participantStats[ticket.closedBy];
      timelineEvents.push(`
        <div class="timeline-event">
          <span class="timeline-icon">🔒</span>
          <span class="timeline-text">Closed by <strong>${sanitizeForHTML(closer?.username || 'Unknown')}</strong> on ${new Date(ticket.closedAt).toLocaleString()}</span>
        </div>
      `);
    }

    const timelineHtml = timelineEvents.join('\n');

    // Generate closing note if present
    let closingNoteHtml = '';
    if (ticket.closingNote) {
      const noteAuthor = participantStats[ticket.closingNoteBy];
      closingNoteHtml = `
        <div class="closing-note">
          <h3>📝 Closing Note</h3>
          <div class="note-author">
            <img class="note-avatar" src="${noteAuthor?.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}" alt="${noteAuthor?.username}">
            <span>${sanitizeForHTML(noteAuthor?.username || 'Unknown')} • ${participantRoles[ticket.closingNoteBy] || 'Staff'}</span>
          </div>
          <div class="note-content">${sanitizeForHTML(ticket.closingNote)}</div>
        </div>
      `;
    }

    // Generate messages HTML
    const messagesHtml = messages.map(msg => {
      const timestamp = new Date(msg.createdTimestamp).toLocaleString();
      const authorName = sanitizeForHTML(msg.author?.username || 'Unknown');
      const authorTag = sanitizeForHTML(msg.author?.tag || 'Unknown');
      const content = sanitizeForHTML(msg.content || '*No content*');
      const avatarUrl = msg.author?.displayAvatarURL() || 'https://cdn.discordapp.com/embed/avatars/0.png';
      const role = participantRoles[msg.author.id] || 'User';
      const roleClass = role.toLowerCase().replace(/\s+/g, '-');
      
      let attachmentsHtml = '';
      if (msg.attachments.size > 0) {
        attachmentsHtml = '<div class="attachments">' +
          Array.from(msg.attachments.values()).map(att => 
            `<a href="${sanitizeForHTML(att.url)}" target="_blank" class="attachment">📎 ${sanitizeForHTML(att.name)}</a>`
          ).join('') +
          '</div>';
      }

      let embedsHtml = '';
      if (msg.embeds.length > 0) {
        embedsHtml = '<div class="embeds">' +
          msg.embeds.map(embed => 
            `<div class="embed">
              ${embed.title ? `<div class="embed-title">${sanitizeForHTML(embed.title)}</div>` : ''}
              ${embed.description ? `<div class="embed-description">${sanitizeForHTML(embed.description)}</div>` : ''}
            </div>`
          ).join('') +
          '</div>';
      }

      return `
        <div class="message">
          <img class="avatar" src="${avatarUrl}" alt="${authorName}" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'">
          <div class="message-content">
            <div class="message-header">
              <span class="author">${authorName}</span>
              <span class="role-badge ${roleClass}">${role}</span>
              <span class="timestamp">${timestamp}</span>
            </div>
            <div class="content">${content}</div>
            ${attachmentsHtml}
            ${embedsHtml}
          </div>
        </div>
      `;
    }).join('\n');

    // Calculate duration
    const duration = ticket.closedAt ? 
      Math.floor((new Date(ticket.closedAt) - new Date(ticket.createdAt)) / 1000 / 60) : 0;
    const durationText = duration > 60 ? 
      `${Math.floor(duration / 60)}h ${duration % 60}m` : 
      `${duration}m`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ticket #${ticket.ticketId} - ${sanitizeForHTML(ticket.category)}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        @page {
            margin: 15mm;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #36393f;
            color: #dcddde;
            font-size: 14px;
            line-height: 1.6;
        }
        
        .container {
            max-width: 900px;
            margin: 0 auto;
            background-color: #2f3136;
            padding: 30px;
        }
        
        .header {
            border-bottom: 3px solid #5865f2;
            padding-bottom: 25px;
            margin-bottom: 30px;
            page-break-after: avoid;
        }
        
        .header h1 {
            color: #fff;
            font-size: 32px;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .header .metadata {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-top: 20px;
        }
        
        .metadata-item {
            background-color: #202225;
            padding: 12px;
            border-radius: 8px;
        }
        
        .metadata-label {
            color: #72767d;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
        }
        
        .metadata-value {
            color: #fff;
            font-size: 15px;
            font-weight: 500;
        }
        
        .participants-section {
            background-color: #202225;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 25px;
            page-break-inside: avoid;
        }
        
        .participants-section h2 {
            color: #fff;
            font-size: 20px;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .participant {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px;
            background-color: #2f3136;
            border-radius: 6px;
            margin-bottom: 8px;
        }
        
        .participant-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            flex-shrink: 0;
        }
        
        .participant-info {
            display: flex;
            align-items: center;
            gap: 10px;
            flex: 1;
        }
        
        .participant-name {
            color: #fff;
            font-weight: 600;
        }
        
        .participant-role {
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .participant-role.user {
            background-color: #43b581;
            color: #fff;
        }
        
        .participant-role.staff {
            background-color: #5865f2;
            color: #fff;
        }
        
        .participant-role.admin {
            background-color: #ed4245;
            color: #fff;
        }
        
        .participant-role.owner {
            background-color: #faa61a;
            color: #fff;
        }
        
        .participant-messages {
            color: #72767d;
            font-size: 12px;
            margin-left: auto;
        }
        
        .timeline-section {
            background-color: #202225;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 25px;
            page-break-inside: avoid;
        }
        
        .timeline-section h2 {
            color: #fff;
            font-size: 20px;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .timeline-event {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 12px;
            background-color: #2f3136;
            border-radius: 6px;
            margin-bottom: 8px;
        }
        
        .timeline-icon {
            font-size: 20px;
            flex-shrink: 0;
        }
        
        .timeline-text {
            color: #dcddde;
            font-size: 14px;
        }
        
        .closing-note {
            background: linear-gradient(135deg, #5865f2 0%, #4752c4 100%);
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 25px;
            page-break-inside: avoid;
        }
        
        .closing-note h3 {
            color: #fff;
            font-size: 18px;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .note-author {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 12px;
            color: #fff;
            font-size: 13px;
            font-weight: 600;
        }
        
        .note-avatar {
            width: 30px;
            height: 30px;
            border-radius: 50%;
        }
        
        .note-content {
            background-color: rgba(255, 255, 255, 0.1);
            padding: 15px;
            border-radius: 6px;
            color: #fff;
            font-size: 14px;
            line-height: 1.6;
            white-space: pre-wrap;
        }
        
        .messages-section {
            background-color: #202225;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 25px;
        }
        
        .messages-section h2 {
            color: #fff;
            font-size: 20px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .messages {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        
        .message {
            display: flex;
            gap: 15px;
            padding: 15px;
            background-color: #2f3136;
            border-radius: 6px;
            page-break-inside: avoid;
        }
        
        .avatar {
            width: 42px;
            height: 42px;
            border-radius: 50%;
            flex-shrink: 0;
        }
        
        .message-content {
            flex: 1;
            min-width: 0;
        }
        
        .message-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 8px;
            flex-wrap: wrap;
        }
        
        .author {
            font-weight: 600;
            color: #fff;
            font-size: 15px;
        }
        
        .role-badge {
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .role-badge.user {
            background-color: #43b581;
            color: #fff;
        }
        
        .role-badge.staff {
            background-color: #5865f2;
            color: #fff;
        }
        
        .role-badge.admin {
            background-color: #ed4245;
            color: #fff;
        }
        
        .role-badge.owner {
            background-color: #faa61a;
            color: #fff;
        }
        
        .timestamp {
            font-size: 12px;
            color: #72767d;
        }
        
        .content {
            color: #dcddde;
            line-height: 1.6;
            word-wrap: break-word;
            overflow-wrap: break-word;
            font-size: 14px;
        }
        
        .attachments {
            margin-top: 10px;
        }
        
        .attachment {
            display: inline-block;
            background-color: #5865f2;
            color: #fff;
            padding: 8px 14px;
            border-radius: 6px;
            text-decoration: none;
            font-size: 13px;
            margin-right: 8px;
            margin-top: 6px;
        }
        
        .embeds {
            margin-top: 10px;
        }
        
        .embed {
            background-color: #202225;
            border-left: 4px solid #5865f2;
            padding: 12px;
            border-radius: 4px;
            margin-bottom: 8px;
        }
        
        .embed-title {
            font-weight: 600;
            color: #fff;
            margin-bottom: 8px;
            font-size: 14px;
        }
        
        .embed-description {
            color: #dcddde;
            font-size: 13px;
            line-height: 1.5;
        }
        
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #202225;
            text-align: center;
            color: #72767d;
            font-size: 12px;
        }
        
        .footer p {
            margin-bottom: 5px;
        }
        
        @media print {
            body {
                background-color: #fff;
                color: #000;
            }
            
            .container {
                background-color: #fff;
            }
            
            .header {
                border-bottom-color: #5865f2;
            }
            
            .participant, .timeline-event, .message {
                break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎫 Ticket #${ticket.ticketId}</h1>
            <div class="metadata">
                <div class="metadata-item">
                    <div class="metadata-label">Category</div>
                    <div class="metadata-value">${sanitizeForHTML(ticket.category)}</div>
                </div>
                <div class="metadata-item">
                    <div class="metadata-label">Status</div>
                    <div class="metadata-value">${ticket.status === 'closed' ? '🔒 Closed' : '🟢 Open'}</div>
                </div>
                <div class="metadata-item">
                    <div class="metadata-label">Created</div>
                    <div class="metadata-value">${new Date(ticket.createdAt).toLocaleString()}</div>
                </div>
                <div class="metadata-item">
                    <div class="metadata-label">Duration</div>
                    <div class="metadata-value">${durationText}</div>
                </div>
            </div>
        </div>
        
        <div class="participants-section">
            <h2>👥 Participants</h2>
            ${participantsHtml}
        </div>
        
        <div class="timeline-section">
            <h2>📅 Timeline</h2>
            ${timelineHtml}
        </div>
        
        ${closingNoteHtml}
        
        <div class="messages-section">
            <h2>💬 Conversation (${messages.length} messages)</h2>
            <div class="messages">
                ${messagesHtml}
            </div>
        </div>
        
        <div class="footer">
            <p><strong>Discord Ticket Bot</strong></p>
            <p>Server: ${sanitizeForHTML(guild.name)}</p>
            <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
    </div>
</body>
</html>
    `;

    return html;
  } catch (error) {
    logger.error('Error generating transcript:', error);
    throw error;
  }
}

/**
 * Generate PDF transcript using PDFKit (no browser dependencies)
 * @param {Array} messages - Array of message objects
 * @param {Object} ticket - Ticket object
 * @param {Object} guild - Discord guild
 * @param {Object} participants - Participant metadata
 * @returns {Promise<string>} PDF file path
 */
export async function generatePDFTranscript(messages, ticket, guild, participants = {}) {
  try {
    // Dynamic import
    const PDFDocument = (await import('pdfkit')).default;
    const { createWriteStream } = await import('fs');
    const { pipeline } = await import('stream/promises');
    
    const transcriptsDir = join(process.cwd(), 'transcripts');
    
    if (!existsSync(transcriptsDir)) {
      await mkdir(transcriptsDir, { recursive: true });
    }

    const filename = `ticket-${ticket.ticketId}-${Date.now()}.pdf`;
    const filepath = join(transcriptsDir, filename);

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      bufferPages: true
    });

    // Pipe to file
    const stream = createWriteStream(filepath);
    doc.pipe(stream);

    // Calculate participant stats
    const participantStats = {};
    const participantRoles = {};
    
    for (const msg of messages) {
      const userId = msg.author.id;
      if (!participantStats[userId]) {
        participantStats[userId] = {
          username: msg.author.username,
          messageCount: 0
        };
      }
      participantStats[userId].messageCount++;
      if (participants[userId]) {
        participantRoles[userId] = participants[userId];
      }
    }

    // --- Header ---
    doc.fontSize(24).fillColor('#5865f2').text(`🎫 Ticket #${ticket.ticketId}`, { underline: true });
    doc.moveDown(0.5);
    
    // Metadata
    doc.fontSize(12).fillColor('#000');
    doc.text(`Category: ${ticket.category}`, { continued: true }).text(`     Status: ${ticket.status === 'closed' ? '🔒 Closed' : '🟢 Open'}`);
    doc.text(`Created: ${new Date(ticket.createdAt).toLocaleString()}`);
    doc.text(`Server: ${guild.name}`);
    
    // Calculate duration
    const duration = ticket.closedAt ? 
      Math.floor((new Date(ticket.closedAt) - new Date(ticket.createdAt)) / 1000 / 60) : 0;
    const durationText = duration > 60 ? 
      `${Math.floor(duration / 60)}h ${duration % 60}m` : `${duration}m`;
    doc.text(`Duration: ${durationText}`);
    doc.moveDown(1);

    // --- Participants ---
    doc.fontSize(16).fillColor('#5865f2').text('👥 Participants', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#000');
    
    for (const [userId, stats] of Object.entries(participantStats)) {
      const role = participantRoles[userId] || 'User';
      doc.text(`• ${stats.username} (${role}) - ${stats.messageCount} messages`);
    }
    doc.moveDown(1);

    // --- Timeline ---
    doc.fontSize(16).fillColor('#5865f2').text('📅 Timeline', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#000');
    
    const opener = participantStats[ticket.userId];
    doc.text(`📂 Opened by ${opener?.username || 'Unknown'} on ${new Date(ticket.createdAt).toLocaleString()}`);
    
    if (ticket.claimedBy && ticket.claimedAt) {
      const claimer = participantStats[ticket.claimedBy];
      doc.text(`✋ Claimed by ${claimer?.username || 'Unknown'} on ${new Date(ticket.claimedAt).toLocaleString()}`);
    }
    
    if (ticket.closedBy && ticket.closedAt) {
      const closer = participantStats[ticket.closedBy];
      doc.text(`🔒 Closed by ${closer?.username || 'Unknown'} on ${new Date(ticket.closedAt).toLocaleString()}`);
    }
    doc.moveDown(1);

    // --- Closing Note ---
    if (ticket.closingNote) {
      const noteAuthor = participantStats[ticket.closingNoteBy];
      doc.fontSize(16).fillColor('#5865f2').text('📝 Closing Note', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#000');
      doc.text(`By: ${noteAuthor?.username || 'Unknown'} (${participantRoles[ticket.closingNoteBy] || 'Staff'})`);
      doc.fontSize(10).fillColor('#333');
      doc.text(ticket.closingNote, { align: 'left', indent: 10 });
      doc.moveDown(1);
    }

    // --- Messages ---
    doc.fontSize(16).fillColor('#5865f2').text(`💬 Conversation (${messages.length} messages)`, { underline: true });
    doc.moveDown(0.5);

    for (const msg of messages) {
      // Check if we need a new page
      if (doc.y > 700) {
        doc.addPage();
      }

      const role = participantRoles[msg.author.id] || 'User';
      const timestamp = new Date(msg.createdTimestamp).toLocaleString();
      
      // Author header
      doc.fontSize(11).fillColor('#5865f2').text(msg.author.username, { continued: true });
      doc.fontSize(9).fillColor('#888').text(` [${role}] - ${timestamp}`);
      
      // Message content
      doc.fontSize(10).fillColor('#000');
      doc.text(msg.content || '*No content*', { indent: 10 });
      
      // Attachments
      if (msg.attachments.size > 0) {
        doc.fontSize(9).fillColor('#666');
        for (const att of msg.attachments.values()) {
          doc.text(`  📎 ${att.name}: ${att.url}`, { link: att.url, indent: 10 });
        }
      }
      
      doc.moveDown(0.5);
    }

    // --- Footer ---
    doc.fontSize(9).fillColor('#888').text(`Generated: ${new Date().toLocaleString()}`, {
      align: 'center'
    });
    doc.text('Discord Ticket Bot', { align: 'center' });

    // Finalize PDF
    doc.end();

    // Wait for write to complete
    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    logger.info(`PDF transcript generated: ${filename}`);
    return filepath;
  } catch (error) {
    logger.error('Error generating PDF transcript:', error);
    throw error;
  }
}

/**
 * Save HTML transcript to file (legacy support)
 * @param {string} html - HTML content
 * @param {string} ticketId - Ticket ID
 * @returns {Promise<string>} File path
 */
export async function saveTranscript(html, ticketId) {
  try {
    const transcriptsDir = join(process.cwd(), 'transcripts');
    
    if (!existsSync(transcriptsDir)) {
      await mkdir(transcriptsDir, { recursive: true });
    }

    const filename = `ticket-${ticketId}-${Date.now()}.html`;
    const filepath = join(transcriptsDir, filename);

    await writeFile(filepath, html, 'utf8');
    logger.info(`HTML transcript saved: ${filename}`);

    return filepath;
  } catch (error) {
    logger.error('Error saving transcript:', error);
    throw error;
  }
}

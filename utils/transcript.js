/**
 * Transcript Generator Utility
 * Generates HTML transcripts of ticket conversations
 */

import { sanitizeForHTML } from './sanitizer.js';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import logger from './logger.js';

/**
 * Generate HTML transcript from messages
 * @param {Array} messages - Array of message objects
 * @param {Object} ticket - Ticket object
 * @param {Object} guild - Discord guild
 * @returns {Promise<string>} HTML transcript
 */
export async function generateTranscript(messages, ticket, guild) {
  try {
    const messagesHtml = messages.map(msg => {
      const timestamp = new Date(msg.createdTimestamp).toLocaleString();
      const authorName = sanitizeForHTML(msg.author?.username || 'Unknown');
      const authorTag = sanitizeForHTML(msg.author?.tag || 'Unknown');
      const content = sanitizeForHTML(msg.content);
      const avatarUrl = msg.author?.displayAvatarURL() || 'https://cdn.discordapp.com/embed/avatars/0.png';
      
      let attachmentsHtml = '';
      if (msg.attachments.size > 0) {
        attachmentsHtml = '<div class="attachments">' +
          Array.from(msg.attachments.values()).map(att => 
            `<a href="${sanitizeForHTML(att.url)}" target="_blank">📎 ${sanitizeForHTML(att.name)}</a>`
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
          <img class="avatar" src="${avatarUrl}" alt="${authorName}">
          <div class="message-content">
            <div class="message-header">
              <span class="author">${authorName}</span>
              <span class="timestamp">${timestamp}</span>
            </div>
            <div class="content">${content}</div>
            ${attachmentsHtml}
            ${embedsHtml}
          </div>
        </div>
      `;
    }).join('\n');

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
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #36393f;
            color: #dcddde;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background-color: #2f3136;
            border-radius: 8px;
            padding: 20px;
        }
        .header {
            border-bottom: 2px solid #202225;
            padding-bottom: 20px;
            margin-bottom: 20px;
        }
        .header h1 {
            color: #fff;
            font-size: 24px;
            margin-bottom: 10px;
        }
        .header .info {
            color: #b9bbbe;
            font-size: 14px;
        }
        .header .info span {
            margin-right: 20px;
        }
        .messages {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        .message {
            display: flex;
            gap: 15px;
            padding: 10px;
            border-radius: 4px;
            transition: background-color 0.2s;
        }
        .message:hover {
            background-color: #32353b;
        }
        .avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            flex-shrink: 0;
        }
        .message-content {
            flex: 1;
        }
        .message-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 5px;
        }
        .author {
            font-weight: 600;
            color: #fff;
        }
        .timestamp {
            font-size: 12px;
            color: #72767d;
        }
        .content {
            color: #dcddde;
            line-height: 1.5;
            word-wrap: break-word;
        }
        .attachments {
            margin-top: 8px;
        }
        .attachments a {
            display: inline-block;
            background-color: #5865f2;
            color: #fff;
            padding: 6px 12px;
            border-radius: 4px;
            text-decoration: none;
            font-size: 14px;
            margin-right: 8px;
            margin-top: 4px;
        }
        .attachments a:hover {
            background-color: #4752c4;
        }
        .embeds {
            margin-top: 8px;
        }
        .embed {
            background-color: #2f3136;
            border-left: 4px solid #5865f2;
            padding: 12px;
            border-radius: 4px;
            margin-bottom: 8px;
        }
        .embed-title {
            font-weight: 600;
            color: #fff;
            margin-bottom: 8px;
        }
        .embed-description {
            color: #dcddde;
            font-size: 14px;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #202225;
            text-align: center;
            color: #72767d;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎫 Ticket #${ticket.ticketId}</h1>
            <div class="info">
                <span><strong>Category:</strong> ${sanitizeForHTML(ticket.category)}</span>
                <span><strong>Opened:</strong> ${new Date(ticket.createdAt).toLocaleString()}</span>
                <span><strong>Closed:</strong> ${new Date(ticket.closedAt || Date.now()).toLocaleString()}</span>
                <span><strong>User:</strong> ${sanitizeForHTML(ticket.userId)}</span>
            </div>
        </div>
        <div class="messages">
            ${messagesHtml}
        </div>
        <div class="footer">
            <p>Generated by Discord Ticket Bot</p>
            <p>Server: ${sanitizeForHTML(guild.name)}</p>
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
 * Save transcript to file
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
    logger.info(`Transcript saved: ${filename}`);

    return filepath;
  } catch (error) {
    logger.error('Error saving transcript:', error);
    throw error;
  }
}

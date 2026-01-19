/**
 * Bot Configuration
 * Stores all behavioral settings, colors, emojis, and IDs
 */

export default {
  // Bot Settings
  bot: {
    debug: process.env.DEBUG_MODE === 'true',
    presence: {
      status: 'online',
      activity: {
        name: '/help | Ticket Support',
        type: 3 // Watching
      }
    }
  },

  // Colors (Hex)
  colors: {
    primary: '#5865F2',
    success: '#57F287',
    warning: '#FEE75C',
    error: '#ED4245',
    info: '#00D9FF'
  },

  // Emojis
  emojis: {
    ticket: '🎫',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    lock: '🔒',
    unlock: '🔓',
    claim: '✋',
    transcript: '📝'
  },

  // Ticket System
  tickets: {
    // Categories for different ticket types
    categories: [
      {
        id: 'support',
        name: 'General Support',
        emoji: '💬',
        description: 'Get help with general questions'
      },
      {
        id: 'billing',
        name: 'Billing & Payments',
        emoji: '💳',
        description: 'Questions about payments and subscriptions'
      },
      {
        id: 'report',
        name: 'Report Issue',
        emoji: '🚨',
        description: 'Report bugs, abuse, or violations'
      },
      {
        id: 'other',
        name: 'Other',
        emoji: '📌',
        description: 'Anything else'
      }
    ],

    // Channel IDs (to be set via /setup command)
    channelIds: {
      ticketPanel: null,
      ticketCategory: null,
      transcriptLog: null,
      modmailLog: null
    },

    // Role IDs (to be set via /setup command)
    roleIds: {
      staff: null,
      admin: null
    },

    // Ticket settings
    maxOpenTickets: 3,
    transcriptEnabled: true,
    dmTranscript: true,
    autoCloseInactive: false,
    autoCloseTime: 48 // hours
  },

  // Rate Limiting
  rateLimit: {
    maxTickets: 3,
    timeWindow: 3600000, // 1 hour in milliseconds
    lockdownMode: false
  },

  // Permissions
  permissions: {
    staff: ['ViewChannel', 'SendMessages', 'ManageMessages', 'ReadMessageHistory'],
    ticketCreator: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles']
  }
};

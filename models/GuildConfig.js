/**
 * Guild Config Model
 * Schema for guild-specific configuration
 */

import mongoose from 'mongoose';

const guildConfigSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Channel IDs
  ticketPanelChannelId: {
    type: String,
    default: null
  },
  ticketCategoryId: {
    type: String,
    default: null
  },
  transcriptLogChannelId: {
    type: String,
    default: null
  },
  modmailLogChannelId: {
    type: String,
    default: null
  },
  
  // Role IDs
  staffRoleId: {
    type: String,
    default: null
  },
  adminRoleId: {
    type: String,
    default: null
  },
  
  // Settings
  maxOpenTickets: {
    type: Number,
    default: 3,
    min: 1,
    max: 10
  },
  transcriptEnabled: {
    type: Boolean,
    default: true
  },
  dmTranscriptEnabled: {
    type: Boolean,
    default: true
  },
  modmailEnabled: {
    type: Boolean,
    default: true
  },
  
  // Rate limiting
  rateLimitEnabled: {
    type: Boolean,
    default: true
  },
  rateLimitMax: {
    type: Number,
    default: 3,
    min: 1,
    max: 10
  },
  rateLimitWindow: {
    type: Number,
    default: 3600000, // 1 hour
    min: 60000 // 1 minute
  },
  
  // Lockdown mode
  lockdownMode: {
    type: Boolean,
    default: false
  },
  lockdownReason: {
    type: String,
    default: null
  },
  
  // Setup status
  setupComplete: {
    type: Boolean,
    default: false
  },
  
  // Ticket panel message ID
  ticketPanelMessageId: {
    type: String,
    default: null
  },
  
  // Auto-Moderation Settings
  autoMod: {
    enabled: {
      type: Boolean,
      default: false
    },
    logChannelId: {
      type: String,
      default: null
    },
    exemptRoles: [{
      type: String
    }],
    filters: {
      invites: {
        enabled: { type: Boolean, default: true },
        action: { type: String, default: 'delete' }
      },
      links: {
        enabled: { type: Boolean, default: false },
        action: { type: String, default: 'delete' },
        whitelist: [{ type: String }]
      },
      mentions: {
        enabled: { type: Boolean, default: true },
        maxMentions: { type: Number, default: 5 },
        action: { type: String, default: 'warn' }
      },
      spam: {
        enabled: { type: Boolean, default: true },
        maxMessages: { type: Number, default: 5 },
        timeWindow: { type: Number, default: 5000 },
        action: { type: String, default: 'timeout' },
        duration: { type: Number, default: 300000 }
      },
      caps: {
        enabled: { type: Boolean, default: true },
        threshold: { type: Number, default: 0.7 },
        minLength: { type: Number, default: 10 },
        action: { type: String, default: 'warn' }
      },
      badWords: {
        enabled: { type: Boolean, default: false },
        words: [{ type: String }],
        action: { type: String, default: 'delete' }
      },
      zalgo: {
        enabled: { type: Boolean, default: true },
        threshold: { type: Number, default: 0.5 },
        action: { type: String, default: 'delete' }
      }
    }
  },
  
  // Anti-Nuke Settings
  antiNuke: {
    enabled: {
      type: Boolean,
      default: false
    },
    logChannelId: {
      type: String,
      default: null
    },
    autoRevoke: {
      type: Boolean,
      default: true
    },
    autoLockdown: {
      type: Boolean,
      default: true
    },
    thresholds: {
      channelDelete: { type: Number, default: 3 },
      roleDelete: { type: Number, default: 3 },
      memberBan: { type: Number, default: 5 }
    }
  },
  
  // Whitelisting
  whitelisted: {
    type: Boolean,
    default: false
  },
  whitelistedBy: {
    type: String,
    default: null
  },
  whitelistedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Static method to get or create config
guildConfigSchema.statics.getConfig = async function(guildId) {
  let config = await this.findOne({ guildId });
  
  if (!config) {
    config = await this.create({ guildId });
  }
  
  return config;
};

const GuildConfig = mongoose.model('GuildConfig', guildConfigSchema);

export default GuildConfig;

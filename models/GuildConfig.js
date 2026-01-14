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

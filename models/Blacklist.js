/**
 * Blacklist Model
 * Schema for blacklisted users
 */

import mongoose from 'mongoose';

const blacklistSchema = new mongoose.Schema({
  // Guild and user information
  guildId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  username: {
    type: String,
    required: true
  },
  
  // Blacklist details
  reason: {
    type: String,
    required: true
  },
  blacklistedBy: {
    type: String,
    required: true
  },
  blacklistedAt: {
    type: Date,
    default: Date.now
  },
  
  // Expiration (optional)
  expiresAt: {
    type: Date,
    default: null
  },
  
  // Active status
  active: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

// Compound index for efficient lookups
blacklistSchema.index({ guildId: 1, userId: 1 });

// Static method to check if user is blacklisted
blacklistSchema.statics.isBlacklisted = async function(guildId, userId) {
  const blacklist = await this.findOne({
    guildId,
    userId,
    active: true,
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  });
  
  return !!blacklist;
};

// Static method to get blacklist entry
blacklistSchema.statics.getBlacklist = async function(guildId, userId) {
  return await this.findOne({
    guildId,
    userId,
    active: true
  });
};

const Blacklist = mongoose.model('Blacklist', blacklistSchema);

export default Blacklist;

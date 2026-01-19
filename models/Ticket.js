/**
 * Ticket Model
 * Schema for ticket storage
 */

import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
  // Ticket identification
  ticketId: {
    type: Number,
    required: true,
    unique: true
  },
  
  // Guild and channel information
  guildId: {
    type: String,
    required: true,
    index: true
  },
  channelId: {
    type: String,
    required: true,
    unique: true
  },
  
  // User information
  userId: {
    type: String,
    required: true,
    index: true
  },
  username: {
    type: String,
    required: true
  },
  
  // Ticket details
  category: {
    type: String,
    required: true,
    enum: ['support', 'billing', 'report', 'other', 'modmail']
  },
  subject: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  
  // Status
  status: {
    type: String,
    enum: ['open', 'claimed', 'closed'],
    default: 'open',
    index: true
  },
  
  // Claimed by (staff member)
  claimedBy: {
    type: String,
    default: null
  },
  claimedAt: {
    type: Date,
    default: null
  },
  
  // Type of ticket
  type: {
    type: String,
    enum: ['server', 'modmail'],
    default: 'server'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  closedAt: {
    type: Date,
    default: null
  },
  closedBy: {
    type: String,
    default: null
  },
  closingNote: {
    type: String,
    default: null
  },
  closingNoteBy: {
    type: String,
    default: null
  },
  
  // Transcript
  transcriptUrl: {
    type: String,
    default: null
  },
  
  // Message count
  messageCount: {
    type: Number,
    default: 0
  },
  
  // Last activity
  lastActivityAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for performance
ticketSchema.index({ guildId: 1, status: 1 });
ticketSchema.index({ userId: 1, status: 1 });
ticketSchema.index({ createdAt: -1 });

// Static method to get next ticket ID
ticketSchema.statics.getNextTicketId = async function(guildId) {
  const lastTicket = await this.findOne({ guildId })
    .sort({ ticketId: -1 })
    .select('ticketId')
    .lean();
  
  return lastTicket ? lastTicket.ticketId + 1 : 1;
};

// Static method to get user's open tickets
ticketSchema.statics.getUserOpenTickets = async function(guildId, userId) {
  return await this.find({
    guildId,
    userId,
    status: { $in: ['open', 'claimed'] }
  }).countDocuments();
};

// Static method to get ticket by channel ID
ticketSchema.statics.getByChannelId = async function(channelId) {
  return await this.findOne({ channelId, status: { $ne: 'closed' } });
};

const Ticket = mongoose.model('Ticket', ticketSchema);

export default Ticket;

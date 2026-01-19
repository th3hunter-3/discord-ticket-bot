/**
 * Database Connection
 * MongoDB connection using Mongoose
 */

import mongoose from 'mongoose';
import logger from '../utils/logger.js';

/**
 * Connect to MongoDB
 * @returns {Promise<void>}
 */
export async function connectDatabase() {
  try {
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    logger.info('Connected to MongoDB successfully');

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

/**
 * Disconnect from MongoDB
 * @returns {Promise<void>}
 */
export async function disconnectDatabase() {
  try {
    await mongoose.connection.close();
    logger.info('Disconnected from MongoDB');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', error);
    throw error;
  }
}

export default mongoose;

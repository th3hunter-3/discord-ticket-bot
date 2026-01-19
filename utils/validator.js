/**
 * Configuration Validator
 * Validates environment variables and configuration
 */

import logger from './logger.js';

/**
 * Required environment variables
 */
const REQUIRED_ENV_VARS = [
  'DISCORD_TOKEN',
  'CLIENT_ID',
  'MONGODB_URI'
];

/**
 * Optional environment variables with defaults
 */
const OPTIONAL_ENV_VARS = {
  'DEBUG_MODE': 'false',
  'OWNER_IDS': '',
  'ERROR_WEBHOOK_URL': ''
};

/**
 * Validate environment variables
 * @returns {boolean} Whether all required variables are present
 */
export function validateEnvironment() {
  let valid = true;
  const missing = [];

  // Check required variables
  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      missing.push(varName);
      valid = false;
    }
  }

  if (!valid) {
    logger.error('Missing required environment variables:', missing.join(', '));
    logger.error('Please check your .env file and ensure all required variables are set.');
    logger.error('See .env.example for reference.');
    return false;
  }

  // Log optional variables that are not set
  for (const [varName, defaultValue] of Object.entries(OPTIONAL_ENV_VARS)) {
    if (!process.env[varName]) {
      logger.warn(`Optional environment variable ${varName} not set, using default: ${defaultValue || '(empty)'}`);
    }
  }

  // Validate specific formats
  if (!validateDiscordToken(process.env.DISCORD_TOKEN)) {
    logger.error('Invalid DISCORD_TOKEN format');
    return false;
  }

  if (!validateClientId(process.env.CLIENT_ID)) {
    logger.error('Invalid CLIENT_ID format');
    return false;
  }

  if (!validateMongoUri(process.env.MONGODB_URI)) {
    logger.error('Invalid MONGODB_URI format');
    return false;
  }

  logger.info('Environment validation successful');
  return true;
}

/**
 * Validate Discord token format
 * @param {string} token - Discord token
 * @returns {boolean} Whether token is valid
 */
function validateDiscordToken(token) {
  if (!token) return false;
  
  // Discord tokens are base64-encoded and typically start with a specific pattern
  // Basic validation: should be a long string with alphanumeric and certain special chars
  return token.length > 50 && /^[A-Za-z0-9._-]+$/.test(token);
}

/**
 * Validate Discord client ID format
 * @param {string} clientId - Discord client ID
 * @returns {boolean} Whether client ID is valid
 */
function validateClientId(clientId) {
  if (!clientId) return false;
  
  // Discord IDs are snowflakes (17-19 digit numbers)
  return /^\d{17,19}$/.test(clientId);
}

/**
 * Validate MongoDB URI format
 * @param {string} uri - MongoDB URI
 * @returns {boolean} Whether URI is valid
 */
function validateMongoUri(uri) {
  if (!uri) return false;
  
  // Basic MongoDB URI validation
  return uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://');
}

/**
 * Validate owner IDs format
 * @returns {boolean} Whether owner IDs are valid
 */
export function validateOwnerIds() {
  const ownerIds = process.env.OWNER_IDS;
  
  if (!ownerIds) {
    logger.warn('No OWNER_IDS set. Owner commands will not be available.');
    return true;
  }

  const ids = ownerIds.split(',').map(id => id.trim());
  
  for (const id of ids) {
    if (!/^\d{17,19}$/.test(id)) {
      logger.error(`Invalid owner ID format: ${id}`);
      return false;
    }
  }

  logger.info(`${ids.length} owner ID(s) configured`);
  return true;
}

/**
 * Validate configuration object
 * @param {Object} config - Configuration object
 * @returns {boolean} Whether configuration is valid
 */
export function validateConfig(config) {
  try {
    // Validate colors are hex
    for (const [key, value] of Object.entries(config.colors)) {
      if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
        logger.error(`Invalid color format for ${key}: ${value}`);
        return false;
      }
    }

    // Validate ticket categories
    if (!Array.isArray(config.tickets.categories) || config.tickets.categories.length === 0) {
      logger.error('No ticket categories configured');
      return false;
    }

    for (const category of config.tickets.categories) {
      if (!category.id || !category.name || !category.description) {
        logger.error('Invalid ticket category configuration');
        return false;
      }
    }

    // Validate rate limit settings
    if (config.rateLimit.maxTickets < 1 || config.rateLimit.maxTickets > 10) {
      logger.error('Rate limit maxTickets must be between 1 and 10');
      return false;
    }

    if (config.rateLimit.timeWindow < 60000) {
      logger.error('Rate limit timeWindow must be at least 60000ms (1 minute)');
      return false;
    }

    logger.info('Configuration validation successful');
    return true;

  } catch (error) {
    logger.error('Error validating configuration:', error);
    return false;
  }
}

/**
 * Get environment info for logging
 * @returns {Object} Environment information
 */
export function getEnvironmentInfo() {
  return {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    debugMode: process.env.DEBUG_MODE === 'true',
    ownerCount: process.env.OWNER_IDS?.split(',').length || 0
  };
}

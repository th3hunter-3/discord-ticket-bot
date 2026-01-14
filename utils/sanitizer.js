/**
 * Sanitization Utility
 * Prevents XSS and injection attacks
 */

import { encode } from 'html-entities';

/**
 * Sanitize text for HTML output (transcripts)
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
export function sanitizeForHTML(text) {
  if (!text) return '';
  return encode(String(text), { mode: 'nonAsciiPrintable' });
}

/**
 * Sanitize user input for database
 * @param {string} input - User input
 * @returns {string} Sanitized input
 */
export function sanitizeInput(input) {
  if (!input) return '';
  
  // Remove null bytes and control characters
  let sanitized = String(input).replace(/\0/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Limit length to prevent DoS
  if (sanitized.length > 2000) {
    sanitized = sanitized.substring(0, 2000);
  }
  
  return sanitized;
}

/**
 * Sanitize MongoDB query to prevent injection
 * @param {Object} query - Query object
 * @returns {Object} Sanitized query
 */
export function sanitizeQuery(query) {
  if (typeof query !== 'object' || query === null) {
    return {};
  }

  const sanitized = {};
  
  for (const [key, value] of Object.entries(query)) {
    // Skip keys that start with $ (MongoDB operators)
    if (key.startsWith('$')) {
      continue;
    }
    
    // Recursively sanitize nested objects
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeQuery(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Validate Discord ID
 * @param {string} id - Discord ID to validate
 * @returns {boolean} Whether the ID is valid
 */
export function isValidDiscordId(id) {
  return /^\d{17,19}$/.test(id);
}

/**
 * Escape markdown characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export function escapeMarkdown(text) {
  if (!text) return '';
  return String(text).replace(/([*_`~|\\])/g, '\\$1');
}

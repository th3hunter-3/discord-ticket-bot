/**
 * Event Handler
 * Dynamically loads and manages events
 */

import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load all events from the events directory
 * @param {Client} client - Discord client
 * @returns {Promise<void>}
 */
export async function loadEvents(client) {
  const eventsPath = join(__dirname, '..', 'events');
  
  try {
    const eventFiles = readdirSync(eventsPath).filter(file => 
      file.endsWith('.js') && !file.startsWith('_')
    );

    logger.info(`Loading ${eventFiles.length} events...`);

    for (const file of eventFiles) {
      const filePath = join(eventsPath, file);
      const fileUrl = `file://${filePath}`;
      
      try {
        const event = await import(fileUrl);
        
        if ('name' in event.default && 'execute' in event.default) {
          if (event.default.once) {
            client.once(event.default.name, (...args) => event.default.execute(...args));
          } else {
            client.on(event.default.name, (...args) => event.default.execute(...args));
          }
          
          logger.debug(`Loaded event: ${event.default.name} (once: ${!!event.default.once})`);
        } else {
          logger.warn(`Event at ${file} is missing required "name" or "execute" property`);
        }
      } catch (error) {
        logger.error(`Error loading event from ${file}:`, error);
      }
    }

    logger.info('Successfully loaded all events');
    
  } catch (error) {
    logger.error('Error loading events:', error);
  }
}

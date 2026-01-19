# Contributing to Discord Ticket Bot

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Follow best practices for JavaScript/Node.js development
- Write clear, maintainable code with proper documentation

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/discord-ticket-bot.git`
3. Create a new branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test thoroughly
6. Commit your changes: `git commit -m "Description of changes"`
7. Push to your fork: `git push origin feature/your-feature-name`
8. Create a Pull Request

## Development Setup

### Prerequisites
- Node.js v18+
- MongoDB
- Discord Bot Token (for testing)

### Installation
```bash
npm install
cp .env.example .env
# Edit .env with your credentials
```

### Running in Development
```bash
npm run dev
```

## Code Style

### JavaScript Style Guide
- Use ES6+ modules (`import/export`)
- Use `const` and `let`, never `var`
- Use arrow functions where appropriate
- Use template literals for string interpolation
- Use async/await instead of callbacks

### Naming Conventions
- Files: `camelCase.js`
- Classes: `PascalCase`
- Functions/Variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Private methods: `_prefixWithUnderscore`

### Documentation
- Add JSDoc comments for all functions
- Include parameter types and return types
- Explain complex logic with inline comments

Example:
```javascript
/**
 * Create a new ticket
 * @param {ModalSubmitInteraction} interaction - Modal interaction
 * @param {string} category - Ticket category
 * @returns {Promise<void>}
 */
async function createTicket(interaction, category) {
  // Implementation
}
```

## Project Structure

```
discord-ticket-bot/
├── commands/           # All slash commands
│   ├── admin/         # Administrator commands
│   ├── owner/         # Bot owner commands
│   ├── staff/         # Staff management commands
│   └── user/          # General user commands
├── events/            # Discord event handlers
├── handlers/          # Command/event loading logic
├── models/            # MongoDB schemas
├── utils/             # Utility functions
│   ├── logger.js      # Winston logger
│   ├── rateLimiter.js # Rate limiting
│   ├── sanitizer.js   # Input sanitization
│   ├── ticketHandler.js # Ticket system logic
│   └── transcript.js  # HTML transcript generation
├── config.js          # Bot configuration
├── index.js           # Main entry point
└── deploy-commands.js # Command deployment
```

## Adding New Features

### Adding a New Command

1. Create a new file in the appropriate folder (`commands/user`, `commands/staff`, etc.)

```javascript
import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('command-name')
    .setDescription('Command description'),

  async execute(interaction) {
    // Command logic
  }
};
```

2. The command will be automatically loaded by the command handler
3. Deploy commands: `npm run deploy-commands`

### Adding a New Event

1. Create a new file in `events/` folder

```javascript
export default {
  name: 'eventName', // Discord.js event name
  once: false,       // Set to true for one-time events
  
  async execute(...args) {
    // Event logic
  }
};
```

2. The event will be automatically loaded by the event handler

### Adding a New Utility

1. Create a new file in `utils/` folder
2. Export functions/classes
3. Import where needed

## Testing

### Manual Testing
1. Create a test Discord server
2. Run the bot with `npm run dev`
3. Test all new functionality
4. Test edge cases and error handling

### Testing Checklist
- [ ] Command executes successfully
- [ ] Error messages are user-friendly
- [ ] Permissions are checked correctly
- [ ] Input is validated and sanitized
- [ ] Database operations work correctly
- [ ] Logging is appropriate
- [ ] No memory leaks

## Database Considerations

### Adding New Fields
- Update the Mongoose schema
- Add migration logic if needed
- Update documentation

### Performance
- Add indexes for frequently queried fields
- Use `.lean()` for read-only queries
- Avoid N+1 queries

## Security

### Important Security Practices
1. **Never commit secrets**: Use `.env` for sensitive data
2. **Sanitize inputs**: Always use sanitization functions
3. **Validate permissions**: Check user permissions before executing commands
4. **Rate limiting**: Implement rate limiting for resource-intensive operations
5. **SQL/NoSQL injection**: Use parameterized queries (Mongoose handles this)

## Pull Request Guidelines

### Before Submitting
- [ ] Code follows the style guide
- [ ] All functions have JSDoc comments
- [ ] Changes are tested thoroughly
- [ ] No console.log() left in code (use logger instead)
- [ ] README updated if needed
- [ ] No merge conflicts

### PR Description
Include:
- What changes were made
- Why the changes were necessary
- How to test the changes
- Screenshots (if UI changes)

## Common Issues

### Bot doesn't start
- Check `.env` file is configured
- Verify MongoDB is running
- Check for syntax errors: `node --check index.js`

### Commands don't appear
- Run `npm run deploy-commands`
- Wait a few minutes for global commands
- Use GUILD_ID for instant updates during development

### Permission errors
- Check bot has required Discord permissions
- Verify role hierarchy (bot role above managed roles)

## Questions?

- Open an issue for bugs
- Create a discussion for questions
- Check existing issues before creating new ones

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

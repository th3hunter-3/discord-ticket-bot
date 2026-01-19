# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-14

### Added
- Initial release of Discord Ticket Bot
- Hybrid ticket system (server-based + modmail)
- Multiple ticket categories (Support, Billing, Report, Other)
- Interactive modal-based ticket creation
- Button-based ticket panel
- HTML transcript generation with beautiful styling
- MongoDB persistence for tickets and configuration
- Rate limiting system to prevent spam
- Blacklist system for blocking abusive users
- Lockdown mode for maintenance
- Comprehensive command system:
  - User commands: help, close, my-tickets
  - Staff commands: reply, add-user, remove-user, claim
  - Admin commands: setup, panel, blacklist, force-close, lockdown
  - Owner commands: eval, restart, reload-commands
- Professional logging with Winston
- Input sanitization for security
- Modular architecture with dynamic command/event loading
- Global error handling with webhook notifications
- Docker support with docker-compose
- PM2 ecosystem configuration
- Comprehensive documentation:
  - README.md with full feature list
  - QUICKSTART.md for easy setup
  - CONTRIBUTING.md for developers
  - SECURITY.md for security policies
  - DOCKER.md for Docker deployment
- Example configuration files
- MIT License

### Security
- XSS prevention in transcripts
- MongoDB injection prevention
- Input validation and sanitization
- Rate limiting per user
- Permission-based command access
- Blacklist system

### Technical
- Node.js v18+ support
- Discord.js v14 integration
- MongoDB with Mongoose ODM
- ES6 modules (import/export)
- JSDoc documentation
- Modular file structure
- Environment-based configuration

[1.0.0]: https://github.com/th3hunter-3/discord-ticket-bot/releases/tag/v1.0.0

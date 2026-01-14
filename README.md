# 🎫 Discord Ticket Bot

A sophisticated, production-ready, open-source Discord Ticket Bot with modmail support, built with Node.js v18+ and Discord.js v14.

## ✨ Features

### Core Features
- **Hybrid Ticket System**: Server-based tickets + DM modmail
- **Multiple Categories**: Support, Billing, Report, and custom categories
- **Interactive Modals**: Collect detailed information before ticket creation
- **Ticket Management**: Claim, close, and manage tickets efficiently
- **HTML Transcripts**: Beautiful HTML transcripts with automatic generation
- **Blacklist System**: Prevent specific users from creating tickets
- **Rate Limiting**: Prevent spam and abuse
- **Lockdown Mode**: Disable ticket creation during maintenance

### Security Features
- Input sanitization (XSS prevention)
- MongoDB injection prevention
- Rate limiting per user
- Permission-based command system
- Blacklist system

### Developer Features
- Modular architecture
- Dynamic command loading
- Professional logging with Winston
- MongoDB persistence
- Comprehensive error handling
- Debug mode

## 📋 Requirements

- Node.js v18 or higher
- MongoDB database
- Discord Bot Token
- Discord Application with appropriate permissions

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd discord-ticket-bot
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_here

# Database Configuration (MongoDB)
MONGODB_URI=mongodb://localhost:27017/discord-ticket-bot

# Owner Configuration (comma-separated Discord user IDs)
OWNER_IDS=123456789012345678,987654321098765432

# Error Logging Webhook (Optional)
ERROR_WEBHOOK_URL=

# Debug Mode
DEBUG_MODE=false
```

### 4. Deploy Commands

Register slash commands with Discord:

```bash
npm run deploy-commands
```

### 5. Start the Bot

```bash
npm start
```

For development with auto-restart:

```bash
npm run dev
```

## 🎯 Setup Guide

### Initial Server Setup

1. **Invite the Bot**: Use the OAuth2 URL with the following permissions:
   - Manage Channels
   - Manage Roles
   - Send Messages
   - Embed Links
   - Attach Files
   - Read Message History
   - Add Reactions

2. **Run Setup Command**: In your Discord server, use:
   ```
   /setup
   ```
   This will automatically create:
   - Ticket category
   - Ticket panel channel
   - Transcript log channel
   - Modmail log channel

3. **Configure Staff Role** (Optional):
   - Set staff role ID in guild config for automatic permissions

4. **Create Ticket Panel**:
   ```
   /panel
   ```
   This creates a button-based ticket panel in your ticket channel

## 📚 Commands

### 👤 User Commands
- `/help` - Display help information
- `/my-tickets` - View your open tickets
- `/close` - Close your ticket (in ticket channel)

### 👮 Staff Commands
- `/reply <message>` - Reply to modmail ticket
- `/add-user <user>` - Add user to ticket
- `/remove-user <user>` - Remove user from ticket
- `/claim` - Claim a ticket

### 🛡️ Admin Commands
- `/setup` - Run interactive setup wizard
- `/panel [channel]` - Create ticket panel
- `/blacklist add <user> <reason>` - Blacklist user
- `/blacklist remove <user>` - Unblacklist user
- `/blacklist list` - View blacklisted users
- `/blacklist check <user>` - Check if user is blacklisted
- `/force-close` - Force close current ticket
- `/lockdown enable [reason]` - Enable lockdown mode
- `/lockdown disable` - Disable lockdown mode
- `/lockdown status` - Check lockdown status

### 👑 Owner Commands
- `/eval <code>` - Evaluate JavaScript (dangerous)
- `/restart` - Restart the bot
- `/reload-commands` - Reload all commands

## 🏗️ Architecture

```
discord-ticket-bot/
├── commands/           # Slash commands
│   ├── admin/         # Admin commands
│   ├── owner/         # Owner-only commands
│   ├── staff/         # Staff commands
│   └── user/          # User commands
├── events/            # Event handlers
│   ├── ready.js
│   ├── interactionCreate.js
│   └── messageCreate.js
├── handlers/          # Command/Event handlers
│   ├── commandHandler.js
│   └── eventHandler.js
├── models/            # MongoDB models
│   ├── Blacklist.js
│   ├── GuildConfig.js
│   ├── Ticket.js
│   └── database.js
├── utils/             # Utility functions
│   ├── logger.js
│   ├── rateLimiter.js
│   ├── sanitizer.js
│   ├── ticketHandler.js
│   └── transcript.js
├── config.js          # Bot configuration
├── index.js           # Main entry point
├── deploy-commands.js # Command deployment
├── package.json
└── .env.example
```

## 🎨 Configuration

Edit `config.js` to customize:

- Colors (hex codes)
- Emojis
- Ticket categories
- Rate limiting settings
- Permission settings
- Auto-close settings

## 🔒 Security

### Input Sanitization
All user inputs are sanitized to prevent:
- XSS attacks in transcripts
- MongoDB injection
- Null byte attacks

### Rate Limiting
- Configurable per-user rate limits
- Prevents ticket spam
- Customizable time windows

### Permissions
- Role-based access control
- Owner-only commands
- Staff/Admin separation

## 📝 Database Schema

### Ticket Schema
- `ticketId`: Unique ticket number
- `guildId`: Guild ID
- `channelId`: Ticket channel ID
- `userId`: User who created ticket
- `category`: Ticket category
- `status`: open/claimed/closed
- `type`: server/modmail
- Timestamps and metadata

### Blacklist Schema
- `guildId`: Guild ID
- `userId`: Blacklisted user
- `reason`: Blacklist reason
- `blacklistedBy`: Admin who blacklisted
- `active`: Status

### Guild Config Schema
- Channel IDs (panel, logs, category)
- Role IDs (staff, admin)
- Settings (rate limits, transcripts, etc.)
- Lockdown status

## 🐛 Debugging

Enable debug mode in `.env`:
```env
DEBUG_MODE=true
```

This will:
- Enable verbose logging
- Show detailed error messages
- Log all command executions

Logs are stored in `logs/` directory:
- `combined.log`: All logs
- `error.log`: Errors only

## 🔧 Troubleshooting

### Bot doesn't respond to commands
- Verify bot token is correct
- Check bot has required permissions
- Ensure commands are deployed: `npm run deploy-commands`
- Check bot is online and connected

### Database connection errors
- Verify MongoDB is running
- Check MONGODB_URI is correct
- Ensure MongoDB is accessible

### Tickets not creating
- Run `/setup` command first
- Check bot has Manage Channels permission
- Verify ticket category exists

### Transcripts not generating
- Check transcript log channel exists
- Verify bot can attach files
- Ensure sufficient disk space

## 📦 Dependencies

- **discord.js** (^14.14.1): Discord API wrapper
- **mongoose** (^8.0.3): MongoDB ODM
- **dotenv** (^16.3.1): Environment variables
- **winston** (^3.11.0): Logging
- **html-entities** (^2.5.2): HTML sanitization

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - See LICENSE file for details

## 💬 Support

For support:
- Create an issue on GitHub
- Join our Discord server (if available)
- Check documentation

## 🙏 Acknowledgments

Built with:
- Discord.js v14
- Node.js
- MongoDB
- Winston Logger

---

**Note**: This bot requires proper configuration and permissions to function correctly. Always test in a development server before deploying to production.

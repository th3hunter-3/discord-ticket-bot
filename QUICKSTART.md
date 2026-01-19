# 🚀 Quick Start Guide

This guide will help you get the Discord Ticket Bot running in minutes.

## Prerequisites

Before starting, ensure you have:
- ✅ Node.js v18+ installed
- ✅ MongoDB installed and running (or MongoDB Atlas account)
- ✅ A Discord account and server for testing

## Step 1: Create Discord Application

1. Go to https://discord.com/developers/applications
2. Click "New Application" and give it a name
3. Go to "Bot" section and click "Add Bot"
4. **Save your bot token** (you'll need this for `.env`)
5. Enable these Privileged Gateway Intents:
   - ✅ Server Members Intent
   - ✅ Message Content Intent
6. Go to "OAuth2" → "General" and copy your **Client ID**

## Step 2: Invite Bot to Server

1. Go to OAuth2 → URL Generator
2. Select these scopes:
   - `bot`
   - `applications.commands`
3. Select these bot permissions:
   - Manage Channels
   - Manage Roles
   - Send Messages
   - Embed Links
   - Attach Files
   - Read Message History
   - Add Reactions
   - Use Slash Commands
4. Copy the generated URL and open it in your browser
5. Select your test server and authorize

## Step 3: Setup MongoDB

### Option A: Local MongoDB
```bash
# Install MongoDB
# https://docs.mongodb.com/manual/installation/

# Start MongoDB
mongod

# MongoDB URI will be: mongodb://localhost:27017/discord-ticket-bot
```

### Option B: MongoDB Atlas (Cloud)
1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Create a database user
4. Whitelist your IP address
5. Get your connection string

## Step 4: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your favorite editor
nano .env  # or vim, code, etc.
```

Fill in these required values:
```env
DISCORD_TOKEN=YOUR_BOT_TOKEN_FROM_STEP_1
CLIENT_ID=YOUR_CLIENT_ID_FROM_STEP_1
GUILD_ID=YOUR_TEST_SERVER_ID  # Right-click server → Copy ID (enable Developer Mode)
MONGODB_URI=mongodb://localhost:27017/discord-ticket-bot  # Or your Atlas URI
OWNER_IDS=YOUR_DISCORD_USER_ID  # Right-click yourself → Copy ID
```

## Step 5: Install Dependencies

```bash
npm install
```

## Step 6: Deploy Commands

```bash
npm run deploy-commands
```

You should see:
```
✅ Successfully deployed X commands to guild!
```

## Step 7: Start the Bot

```bash
npm start
```

You should see:
```
[INFO] Connected to MongoDB successfully
[INFO] Logged in as YourBot#1234!
[INFO] Bot is ready!
```

## Step 8: Setup in Discord

In your Discord server:

1. Run `/setup` command
   - This creates necessary channels and categories
   - Wait for success message

2. Run `/panel` command
   - This creates the ticket creation button
   - Button will appear in the `#🎫-create-ticket` channel

## Step 9: Test It Out!

### Test Server Ticket
1. Click the "Create Ticket" button
2. Select a category from dropdown
3. Fill in the modal form
4. Submit!

### Test Modmail
1. DM the bot
2. Send any message
3. A ticket will be created automatically

### Test Commands
- `/help` - View all commands
- `/my-tickets` - See your tickets
- `/close` - Close a ticket (in ticket channel)

## Common Issues

### Bot doesn't respond
- ✅ Check bot is online (green status)
- ✅ Verify token in `.env` is correct
- ✅ Ensure commands were deployed
- ✅ Check bot has correct permissions

### Can't create tickets
- ✅ Run `/setup` first
- ✅ Check bot can manage channels
- ✅ Verify MongoDB is running

### MongoDB connection error
- ✅ Ensure MongoDB is running
- ✅ Check MONGODB_URI is correct
- ✅ For Atlas: whitelist your IP

### Commands not appearing
- ✅ Run `npm run deploy-commands`
- ✅ Check CLIENT_ID is correct
- ✅ Wait 1-2 minutes for registration

## Next Steps

1. **Configure Staff Role**: Set staff role in guild config for automatic permissions
2. **Customize**: Edit `config.js` to customize colors, emojis, categories
3. **Production**: When ready, remove GUILD_ID from `.env` for global commands
4. **Monitor**: Check `logs/` folder for bot activity
5. **Read Docs**: See `README.md` for detailed documentation

## Development Tips

```bash
# Watch mode (auto-restart on changes)
npm run dev

# Check syntax
node --check index.js

# View logs
tail -f logs/combined.log
```

## Getting Help

- 📖 Read `README.md` for detailed docs
- 🐛 Check GitHub issues
- 💬 Join our Discord (if available)
- 🔒 See `SECURITY.md` for security concerns

## Production Checklist

Before going to production:

- [ ] Remove GUILD_ID from `.env` (for global commands)
- [ ] Set DEBUG_MODE=false
- [ ] Use authenticated MongoDB
- [ ] Secure bot token (never commit!)
- [ ] Set up error webhook (optional)
- [ ] Configure rate limits appropriately
- [ ] Test all features thoroughly
- [ ] Set up MongoDB backups
- [ ] Monitor bot health
- [ ] Document your server setup

---

🎉 **Congratulations!** Your ticket bot is ready to use!

For more information, see the full [README.md](README.md)

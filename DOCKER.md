# Docker Deployment Guide

This guide explains how to deploy the Discord Ticket Bot using Docker.

## Prerequisites

- Docker installed
- Docker Compose installed
- Discord Bot Token
- MongoDB credentials

## Quick Start

### 1. Configure Environment

Copy and edit the environment file:
```bash
cp .env.example .env
nano .env
```

Update MongoDB URI for Docker:
```env
MONGODB_URI=mongodb://admin:your_secure_password_here@mongodb:27017/discord-ticket-bot?authSource=admin
```

### 2. Update Docker Compose

Edit `docker-compose.yml` and change the MongoDB password:
```yaml
MONGO_INITDB_ROOT_PASSWORD: your_secure_password_here
```

### 3. Build and Start

```bash
# Build the bot image
docker-compose build

# Start all services
docker-compose up -d
```

### 4. Deploy Commands

```bash
# Run inside container
docker-compose exec bot node deploy-commands.js
```

### 5. View Logs

```bash
# View bot logs
docker-compose logs -f bot

# View MongoDB logs
docker-compose logs -f mongodb
```

## Management Commands

```bash
# Stop services
docker-compose down

# Restart bot
docker-compose restart bot

# View running containers
docker-compose ps

# Execute commands in container
docker-compose exec bot sh
```

## Production Deployment

### Security Best Practices

1. **Use secrets management**:
   ```bash
   # Create secrets
   echo "your_token" | docker secret create discord_token -
   ```

2. **Use volumes for persistence**:
   - MongoDB data is persisted in `mongodb_data` volume
   - Logs are mounted from host
   - Transcripts are mounted from host

3. **Network isolation**:
   - Bot and MongoDB use private network
   - Only necessary ports exposed

### Resource Limits

Add resource limits to `docker-compose.yml`:

```yaml
services:
  bot:
    # ... existing config ...
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

### Health Checks

Add health check to bot service:

```yaml
services:
  bot:
    # ... existing config ...
    healthcheck:
      test: ["CMD", "node", "-e", "require('net').connect(3000)"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Backup and Restore

### Backup MongoDB

```bash
# Create backup
docker-compose exec mongodb mongodump \
  --username admin \
  --password your_secure_password_here \
  --authenticationDatabase admin \
  --out /data/backup

# Copy backup to host
docker cp ticket-bot-mongodb:/data/backup ./backup
```

### Restore MongoDB

```bash
# Copy backup to container
docker cp ./backup ticket-bot-mongodb:/data/backup

# Restore
docker-compose exec mongodb mongorestore \
  --username admin \
  --password your_secure_password_here \
  --authenticationDatabase admin \
  /data/backup
```

## Monitoring

### View Resource Usage

```bash
docker stats ticket-bot ticket-bot-mongodb
```

### Access MongoDB Shell

```bash
docker-compose exec mongodb mongosh \
  -u admin \
  -p your_secure_password_here \
  --authenticationDatabase admin
```

## Troubleshooting

### Bot won't start
```bash
# Check logs
docker-compose logs bot

# Check if MongoDB is ready
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"
```

### MongoDB connection issues
```bash
# Verify connection string
docker-compose exec bot sh -c 'echo $MONGODB_URI'

# Test MongoDB connectivity
docker-compose exec bot sh -c 'nc -zv mongodb 27017'
```

### Permission issues
```bash
# Fix file permissions
sudo chown -R 1001:1001 logs transcripts
```

## Updating

### Update Bot Code

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose build bot
docker-compose up -d bot
```

### Update Dependencies

```bash
# Update package.json
# Rebuild image
docker-compose build --no-cache bot
docker-compose up -d bot
```

## Scaling (Advanced)

For high-traffic bots, consider:

1. **Separate Database Server**:
   - Use external MongoDB cluster
   - Update MONGODB_URI

2. **Load Balancing**:
   - Not applicable for Discord bots (single instance)

3. **Monitoring**:
   - Add Prometheus metrics
   - Use Grafana dashboards

## Production Checklist

- [ ] Changed default MongoDB password
- [ ] Configured proper environment variables
- [ ] Set up automated backups
- [ ] Configured log rotation
- [ ] Set resource limits
- [ ] Enabled health checks
- [ ] Tested bot functionality
- [ ] Documented deployment process
- [ ] Set up monitoring/alerting

## Support

For Docker-specific issues:
- Check Docker logs: `docker-compose logs`
- Verify networking: `docker network inspect ticket-bot-network`
- Test connectivity: `docker-compose exec bot ping mongodb`

---

For general bot issues, see [QUICKSTART.md](QUICKSTART.md) or [README.md](README.md)

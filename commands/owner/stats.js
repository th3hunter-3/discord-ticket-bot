/**
 * Stats Command
 * 
 * Display comprehensive bot statistics
 * Owner only
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import Ticket from '../../models/Ticket.js';
import GuildConfig from '../../models/GuildConfig.js';
import Blacklist from '../../models/Blacklist.js';
import healthMonitor from '../../services/HealthMonitor.js';
import rateLimiter from '../../middleware/RateLimiter.js';
import permissionValidator from '../../middleware/PermissionValidator.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View comprehensive bot statistics (owner only)'),
  
  execute: async function(interaction) {
    // Owner check
    const ownerIds = process.env.OWNER_IDS?.split(',') || [];
    if (!ownerIds.includes(interaction.user.id)) {
      return await interaction.reply({
        content: '❌ This command is restricted to bot owners only.',
        ephemeral: true
      });
    }
    
    try {
      await interaction.deferReply({ ephemeral: true });
      
      // Gather statistics
      const [
        totalTickets,
        openTickets,
        closedTickets,
        totalGuilds,
        blacklistedUsers,
        health,
        rateLimiterStats,
        auditStats
      ] = await Promise.all([
        Ticket.countDocuments(),
        Ticket.countDocuments({ status: { $in: ['open', 'claimed'] } }),
        Ticket.countDocuments({ status: 'closed' }),
        GuildConfig.countDocuments(),
        Blacklist.countDocuments({ active: true }),
        healthMonitor.getHealth(),
        rateLimiter.getStats(),
        permissionValidator.getAuditStats()
      ]);
      
      // Top guilds by ticket count
      const topGuilds = await Ticket.aggregate([
        { $group: { _id: '$guildId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);
      
      // Format uptime
      const uptime = process.uptime();
      const days = Math.floor(uptime / 86400);
      const hours = Math.floor((uptime % 86400) / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const uptimeString = `${days}d ${hours}h ${minutes}m`;
      
      // Format memory
      const memoryUsage = process.memoryUsage();
      const memoryMB = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
      const memoryTotal = (memoryUsage.heapTotal / 1024 / 1024).toFixed(2);
      const memoryPercent = ((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100).toFixed(1);
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle('📊 Bot Statistics Dashboard')
        .setColor(0x5865F2)
        .setTimestamp();
      
      // System Stats
      embed.addFields({
        name: '💻 System',
        value: `**Uptime:** ${uptimeString}\n**Memory:** ${memoryMB}MB / ${memoryTotal}MB (${memoryPercent}%)\n**Node.js:** ${process.version}\n**Platform:** ${process.platform}`,
        inline: false
      });
      
      // Bot Stats
      embed.addFields({
        name: '🤖 Bot',
        value: `**Guilds:** ${interaction.client.guilds.cache.size}\n**Users:** ${interaction.client.users.cache.size}\n**Channels:** ${interaction.client.channels.cache.size}\n**Commands:** ${interaction.client.commands.size}`,
        inline: true
      });
      
      // Ticket Stats
      embed.addFields({
        name: '🎫 Tickets',
        value: `**Total:** ${totalTickets}\n**Open:** ${openTickets}\n**Closed:** ${closedTickets}\n**Configured Guilds:** ${totalGuilds}`,
        inline: true
      });
      
      // Security Stats
      const securityStats = health.metrics.security || {};
      embed.addFields({
        name: '🛡️ Security',
        value: `**Auto-Mod Actions:** ${securityStats.autoModActions || 0}\n**Nuke Detections:** ${securityStats.nukeDetections || 0}\n**Blacklisted:** ${blacklistedUsers}\n**Rate Limit Violations:** ${rateLimiterStats.totalViolations || 0}`,
        inline: true
      });
      
      // Rate Limiter Stats
      embed.addFields({
        name: '⏱️ Rate Limiter',
        value: `**Active Users:** ${rateLimiterStats.activeUsers || 0}\n**Blacklisted:** ${rateLimiterStats.blacklistedUsers || 0}\n**Avg Trust Score:** ${rateLimiterStats.averageTrustScore || 100}`,
        inline: true
      });
      
      // Audit Stats
      embed.addFields({
        name: '📋 Audit Log',
        value: `**Total Actions:** ${auditStats.totalActions || 0}\n**Dangerous Actions:** ${auditStats.dangerousActions || 0}\n**Tracked Users:** ${auditStats.totalUsers || 0}`,
        inline: true
      });
      
      // Health Status
      const healthStatus = health.healthy ? '✅ Healthy' : '❌ Unhealthy';
      const healthColor = health.healthy ? '🟢' : '🔴';
      embed.addFields({
        name: `${healthColor} Health`,
        value: `**Status:** ${healthStatus}\n**Bot Connection:** ${health.checks.botConnection ? '✅' : '❌'}\n**Database:** ${health.checks.database ? '✅' : '❌'}`,
        inline: true
      });
      
      // Top Guilds
      if (topGuilds.length > 0) {
        const topGuildsText = topGuilds.map((g, i) => {
          const guild = interaction.client.guilds.cache.get(g._id);
          const name = guild ? guild.name : `Unknown (${g._id.substring(0, 8)}...)`;
          return `${i + 1}. ${name}: ${g.count} tickets`;
        }).join('\n');
        
        embed.addFields({
          name: '🏆 Top Guilds by Tickets',
          value: topGuildsText,
          inline: false
        });
      }
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      logger.error('Error in stats command:', error);
      await interaction.editReply({
        content: '❌ An error occurred while gathering statistics.'
      });
    }
  }
};

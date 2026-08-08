// Services/Implementation/RoomCleanupService.cs

using guzogo.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace guzogo.Services.Implementation
{
    public class RoomCleanupService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<RoomCleanupService> _logger;

        public RoomCleanupService(IServiceScopeFactory scopeFactory, ILogger<RoomCleanupService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await CleanupOldRooms();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error cleaning up old rooms");
                }

                // Run every 30 minutes
                await Task.Delay(TimeSpan.FromMinutes(30), stoppingToken);
            }
        }

        private async Task CleanupOldRooms()
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            var cutoffTime = DateTime.UtcNow.AddHours(-12);

            // Find rooms older than 12 hours that are still active
            var oldRooms = await context.Rooms
                .Include(r => r.Participants)
                .Include(r => r.Messages)
                .Where(r => r.IsActive && r.CreatedAt <= cutoffTime)
                .ToListAsync();

            if (oldRooms.Any())
            {
                foreach (var room in oldRooms)
                {
                    room.IsActive = false;
                    room.EndedAt = DateTime.UtcNow;

                    // Mark all active participants as left
                    var activeParticipants = room.Participants
                        .Where(p => p.LeftAt == null);

                    foreach (var p in activeParticipants)
                    {
                        p.LeftAt = DateTime.UtcNow;
                    }
                }

                await context.SaveChangesAsync();
                _logger.LogInformation($"Cleaned up {oldRooms.Count} old rooms");
            }
        }
    }
}
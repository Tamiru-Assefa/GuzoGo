using guzogo.Data;
using guzogo.Enums;
using guzogo.Services.Interface;
using Microsoft.EntityFrameworkCore;

namespace guzogo.Services.Implementation
{
    public class MatchSessionService : IMatchSessionService
    {
        private readonly ApplicationDbContext _context;


        public MatchSessionService(ApplicationDbContext context)
        {
            _context = context;
        }


        public async Task<bool> EndSessionAsync(int sessionId)
        {
            var session = await _context.MatchSessions
                .FirstOrDefaultAsync(x => x.Id == sessionId);


            if (session == null)
                return false;


            // Calculate duration
            session.EndedAt = DateTime.UtcNow;

            session.Duration =
                (int)(session.EndedAt.Value - session.StartedAt)
                .TotalMinutes;


            session.Status = MatchSessionStatus.Completed;
            session.EndReason = "Completed";


            // Make both users available again

            var user1Preference =
                await _context.MatchPreferences
                .FirstOrDefaultAsync(x =>
                    x.UserId == session.User1Id);


            var user2Preference =
                await _context.MatchPreferences
                .FirstOrDefaultAsync(x =>
                    x.UserId == session.User2Id);



            if (user1Preference != null)
                user1Preference.IsSearching = false;


            if (user2Preference != null)
                user2Preference.IsSearching = false;



            // Update statistics

            var user1Stats =
                await _context.UserStatistics
                .FirstOrDefaultAsync(x =>
                    x.UserId == session.User1Id);


            var user2Stats =
                await _context.UserStatistics
                .FirstOrDefaultAsync(x =>
                    x.UserId == session.User2Id);



            if (user1Stats != null)
            {
                user1Stats.TotalMatches++;
                user1Stats.CompletedCalls++;
                user1Stats.TotalCallMinutes += session.Duration;
                user1Stats.UpdatedAt = DateTime.UtcNow;
            }


            if (user2Stats != null)
            {
                user2Stats.TotalMatches++;
                user2Stats.CompletedCalls++;
                user2Stats.TotalCallMinutes += session.Duration;
                user2Stats.UpdatedAt = DateTime.UtcNow;
            }



            await _context.SaveChangesAsync();


            return true;
        }
    }
}
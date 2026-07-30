using guzogo.Data;
using guzogo.DTOs.Matching;
using guzogo.Entities;
using guzogo.Enums;
using guzogo.Services.Interface;
using guzogo.Services.Matching;
using Microsoft.EntityFrameworkCore;

namespace guzogo.Services.Implementations
{
    public class MatchingService : IMatchingService
    {
        private readonly ApplicationDbContext _context;
        private readonly MatchScoreCalculator _scoreCalculator;

        // Static lock shared across all requests to synchronize room creation
        private static readonly SemaphoreSlim _matchingLock = new SemaphoreSlim(1, 1);

        public MatchingService(
            ApplicationDbContext context,
            MatchScoreCalculator scoreCalculator)
        {
            _context = context;
            _scoreCalculator = scoreCalculator;
        }

        public async Task<MatchResultDto> FindBestMatchAsync(int userId)
        {
            // 1. Fast path check: See if this user already has an active session before locking
            var existingSession = await GetActiveSessionForUserAsync(userId);
            if (existingSession != null)
            {
                return await BuildMatchResultAsync(existingSession, userId);
            }

            // 2. Acquire lock: Ensure only ONE thread attempts matching and session creation at a time
            await _matchingLock.WaitAsync();

            try
            {
                // Re-check inside the lock: Another thread might have created a session while this request was waiting
                existingSession = await GetActiveSessionForUserAsync(userId);
                if (existingSession != null)
                {
                    return await BuildMatchResultAsync(existingSession, userId);
                }

                // 3. Load current user's profile
                var currentProfile = await _context.Profiles
                    .Include(p => p.User)
                    .Include(p => p.ProfessionTitle)
                    .Include(p => p.ProfileSkills)
                        .ThenInclude(ps => ps.Skill)
                    .FirstOrDefaultAsync(p => p.UserId == userId);

                if (currentProfile == null)
                {
                    return new MatchResultDto { Matched = false };
                }

                // 4. Load current user's preference
                var currentPreference = await _context.MatchPreferences
                    .Include(x => x.PreferenceSkills)
                        .ThenInclude(ps => ps.Skill)
                    .FirstOrDefaultAsync(x => x.UserId == userId && x.IsSearching);

                if (currentPreference == null)
                {
                    return new MatchResultDto { Matched = false };
                }

                // 5. Find all candidate users currently searching
                var candidates = await _context.MatchPreferences
                    .Where(x => x.IsSearching && x.UserId != userId)
                    .Include(x => x.User)
                        .ThenInclude(u => u.Profile)
                            .ThenInclude(p => p.ProfileSkills)
                                .ThenInclude(ps => ps.Skill)
                    .Include(x => x.User)
                        .ThenInclude(u => u.Profile)
                            .ThenInclude(p => p.ProfessionTitle)
                    .ToListAsync();

                int bestScore = -1;
                MatchedUserDto? bestUser = null;

                // 6. Score every candidate
                foreach (var candidatePreference in candidates)
                {
                    var candidateProfile = candidatePreference.User.Profile;

                    if (candidateProfile == null)
                        continue;

                    int score = _scoreCalculator.CalculateScore(
                        currentProfile,
                        currentPreference,
                        candidateProfile,
                        candidatePreference);

                    if (score > bestScore)
                    {
                        bestScore = score;

                        bestUser = new MatchedUserDto
                        {
                            UserId = candidateProfile.UserId,
                            FullName = $"{candidateProfile.FirstName} {candidateProfile.LastName}",
                            Profession = candidateProfile.ProfessionTitle?.Name ?? "",
                            ProfilePictureUrl = candidateProfile.ProfilePictureUrl,
                            Skills = candidateProfile.ProfileSkills
                                .Select(ps => ps.Skill.Name)
                                .ToList(),
                            MatchScore = score
                        };
                    }
                }

                if (bestUser == null)
                {
                    return new MatchResultDto { Matched = false };
                }

                // 7. Verify candidate is still available (hasn't entered an active session)
                var candidateActiveSession = await _context.MatchSessions
                    .AnyAsync(s => (s.User1Id == bestUser.UserId || s.User2Id == bestUser.UserId) &&
                                   s.Status == MatchSessionStatus.Active);

                if (candidateActiveSession)
                {
                    return new MatchResultDto { Matched = false };
                }

                // 8. Create Match Session inside the lock
                var session = new MatchSession
                {
                    User1Id = userId,
                    User2Id = bestUser.UserId,
                    RoomId = Guid.NewGuid().ToString(),
                    Status = MatchSessionStatus.Active,
                    StartedAt = DateTime.UtcNow
                };

                _context.MatchSessions.Add(session);

                // Stop both users from searching
                currentPreference.IsSearching = false;

                var matchedUserPreference = await _context.MatchPreferences
                    .FirstOrDefaultAsync(x => x.UserId == bestUser.UserId);

                if (matchedUserPreference != null)
                {
                    matchedUserPreference.IsSearching = false;
                }

                // Save to database BEFORE releasing the lock
                await _context.SaveChangesAsync();

                return new MatchResultDto
                {
                    Matched = true,
                    SessionId = session.Id,
                    MatchScore = bestScore,
                    User = bestUser,
                    RoomId = session.RoomId
                };
            }
            finally
            {
                // Always release the lock in a finally block
                _matchingLock.Release();
            }
        }

        #region Helper Methods

        private async Task<MatchSession?> GetActiveSessionForUserAsync(int userId)
        {
            return await _context.MatchSessions
                .FirstOrDefaultAsync(s =>
                    (s.User1Id == userId || s.User2Id == userId) &&
                    s.Status == MatchSessionStatus.Active);
        }

        private async Task<MatchResultDto> BuildMatchResultAsync(MatchSession session, int currentUserId)
        {
            int matchedUserId = session.User1Id == currentUserId
                ? session.User2Id
                : session.User1Id;

            var matchedProfile = await _context.Profiles
                .Include(p => p.ProfessionTitle)
                .Include(p => p.ProfileSkills)
                    .ThenInclude(ps => ps.Skill)
                .FirstOrDefaultAsync(p => p.UserId == matchedUserId);

            return new MatchResultDto
            {
                Matched = true,
                SessionId = session.Id,
                RoomId = session.RoomId,
                User = matchedProfile == null ? null : new MatchedUserDto
                {
                    UserId = matchedProfile.UserId,
                    FullName = $"{matchedProfile.FirstName} {matchedProfile.LastName}",
                    Profession = matchedProfile.ProfessionTitle?.Name ?? "",
                    ProfilePictureUrl = matchedProfile.ProfilePictureUrl,
                    Skills = matchedProfile.ProfileSkills
                        .Select(ps => ps.Skill.Name)
                        .ToList()
                }
            };
        }

        #endregion
    }
}
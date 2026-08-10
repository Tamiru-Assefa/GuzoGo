using System.Net.Http.Json;
using System.Text.Json;
using guzogo.Data;
using guzogo.DTOs.Matching;
using guzogo.Entities;
using guzogo.Enums;
using guzogo.Services.Interface;
using Microsoft.EntityFrameworkCore;

namespace guzogo.Services.Implementations
{
    public class MatchingService : IMatchingService
    {
        private readonly ApplicationDbContext _context;
        private readonly IHttpClientFactory _httpClientFactory;
        private static readonly SemaphoreSlim _matchingLock = new SemaphoreSlim(1, 1);

        public MatchingService(
            ApplicationDbContext context,
            IHttpClientFactory httpClientFactory)
        {
            _context = context;
            _httpClientFactory = httpClientFactory;
        }

        public async Task<MatchResultDto> FindBestMatchAsync(int userId)
        {
            // 1. Already in an active session?
            var existingSession = await GetActiveSessionForUserAsync(userId);
            if (existingSession != null)
                return await BuildMatchResultAsync(existingSession, userId);

            await _matchingLock.WaitAsync();
            try
            {
                existingSession = await GetActiveSessionForUserAsync(userId);
                if (existingSession != null)
                    return await BuildMatchResultAsync(existingSession, userId);

                // 2. Load current user's preference
                var currentPreference = await _context.MatchPreferences
                    .FirstOrDefaultAsync(p => p.UserId == userId && p.IsSearching);
                if (currentPreference == null)
                    return new MatchResultDto { Matched = false };

                // 3. Call the AI matching service
                try
                {
                    var client = _httpClientFactory.CreateClient("AIMatcher");
                    Console.WriteLine($"Calling AI matcher for user {userId}...");

                    var response = await client.PostAsync($"/match/{userId}", null);
                    var responseContent = await response.Content.ReadAsStringAsync();

                    Console.WriteLine("========== AI MATCHER RESPONSE ==========");
                    Console.WriteLine($"Status: {(int)response.StatusCode}");
                    Console.WriteLine(responseContent);
                    Console.WriteLine("==========================================");

                    if (!response.IsSuccessStatusCode)
                    {
                        Console.WriteLine("AI MATCHER RETURNED ERROR.");
                        return new MatchResultDto { Matched = false };
                    }

                    var aiResponse = JsonSerializer.Deserialize<AIMatchResponse>(
                        responseContent,
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                    if (aiResponse == null || aiResponse.Results == null || aiResponse.Results.Count == 0)
                    {
                        Console.WriteLine("AI RESPONSE EMPTY OR NO CANDIDATES.");
                        return new MatchResultDto { Matched = false };
                    }

                    // 4. Apply repeat‑match penalty and pick best candidate
                    double bestAdjustedScore = -1;
                    AIMatchResult? bestCandidate = null;

                    foreach (var candidate in aiResponse.Results)
                    {
                        if (candidate.CandidateUserId == userId) continue;

                        int previousMatches = await GetPreviousMatchCountAsync(userId, candidate.CandidateUserId);
                        int penalty = previousMatches switch
                        {
                            0 => 0,
                            1 => 25,
                            2 => 40,
                            _ => 50
                        };

                        double adjustedScore = candidate.Score - penalty;
                        if (adjustedScore < 0.01) adjustedScore = 0.01; // floor, never zero or negative

                        Console.WriteLine($"Candidate {candidate.CandidateUserId}: AI={candidate.Score}, " +
                                          $"Previous={previousMatches}, Penalty={penalty}, Adjusted={adjustedScore}");

                        if (adjustedScore > bestAdjustedScore)
                        {
                            bestAdjustedScore = adjustedScore;
                            bestCandidate = candidate;
                        }
                    }

                    if (bestCandidate == null)
                    {
                        Console.WriteLine("No suitable candidate after penalty.");
                        return new MatchResultDto { Matched = false };
                    }

                    int bestCandidateId = bestCandidate.CandidateUserId;
                    Console.WriteLine($"Best candidate: {bestCandidateId} (adjusted score: {bestAdjustedScore})");

                    // 5. Ensure candidate not already in active session
                    bool candidateActive = await _context.MatchSessions
                        .AnyAsync(s =>
                            (s.User1Id == bestCandidateId || s.User2Id == bestCandidateId) &&
                            s.Status == MatchSessionStatus.Active);

                    if (candidateActive)
                    {
                        Console.WriteLine($"Candidate {bestCandidateId} already in active session.");
                        return new MatchResultDto { Matched = false };
                    }

                    // 6. Create MatchSession
                    var session = new MatchSession
                    {
                        User1Id = userId,
                        User2Id = bestCandidateId,
                        RoomId = Guid.NewGuid().ToString(),
                        Status = MatchSessionStatus.Active,
                        StartedAt = DateTime.UtcNow
                    };
                    _context.MatchSessions.Add(session);

                    // 7. Stop both users from searching
                    currentPreference.IsSearching = false;
                    var candidatePref = await _context.MatchPreferences
                        .FirstOrDefaultAsync(p => p.UserId == bestCandidateId);
                    if (candidatePref != null) candidatePref.IsSearching = false;

                    await _context.SaveChangesAsync();

                    Console.WriteLine($"MatchSession created: {session.Id}, RoomId: {session.RoomId}");

                    // 8. Build and return result
                    var matchedUser = await BuildMatchedUserDto(bestCandidateId);
                    var result = new MatchResultDto
                    {
                        Matched = true,
                        SessionId = session.Id,
                        RoomId = session.RoomId,
                        MatchScore = (int)bestAdjustedScore,
                        User = matchedUser
                    };

                    Console.WriteLine("========== .NET MATCH RESULT ==========");
                    Console.WriteLine(JsonSerializer.Serialize(result));
                    Console.WriteLine("=======================================");

                    return result;
                }
                catch (Exception ex)
                {
                    Console.WriteLine("========== MATCHING ERROR ==========");
                    Console.WriteLine(ex.ToString());
                    Console.WriteLine("====================================");
                    throw;
                }
            }
            finally
            {
                _matchingLock.Release();
            }
        }

        // ---------- Helper methods ----------
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
                ? session.User2Id : session.User1Id;

            var matchedProfile = await _context.Profiles
                .Include(p => p.ProfessionTitle)
                .Include(p => p.ProfileSkills).ThenInclude(ps => ps.Skill)
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
                    Skills = matchedProfile.ProfileSkills.Select(ps => ps.Skill.Name).ToList()
                }
            };
        }

        private async Task<MatchedUserDto?> BuildMatchedUserDto(int userId)
        {
            var profile = await _context.Profiles
                .Include(p => p.ProfessionTitle)
                .Include(p => p.ProfileSkills).ThenInclude(ps => ps.Skill)
                .FirstOrDefaultAsync(p => p.UserId == userId);
            if (profile == null) return null;

            return new MatchedUserDto
            {
                UserId = profile.UserId,
                FullName = $"{profile.FirstName} {profile.LastName}",
                Profession = profile.ProfessionTitle?.Name ?? "",
                ProfilePictureUrl = profile.ProfilePictureUrl,
                Skills = profile.ProfileSkills.Select(ps => ps.Skill.Name).ToList()
            };
        }

        private async Task<int> GetPreviousMatchCountAsync(int userId, int candidateUserId)
        {
            return await _context.MatchSessions
                .CountAsync(s =>
                    (s.User1Id == userId && s.User2Id == candidateUserId) ||
                    (s.User1Id == candidateUserId && s.User2Id == userId));
        }
    }

    // ---- DTOs for AI response ----
    public class AIMatchResponse
    {
        public bool Matched { get; set; }
        public AIMatchResult? BestMatch { get; set; }
        public List<AIMatchResult> Results { get; set; } = new();
    }

    public class AIMatchResult
    {
        public int CandidateUserId { get; set; }
        public double Score { get; set; }
    }
}


//*****************************************************************
//               AI Matching Service Implementation + Fallback
//********************************************************************
//using System.Net.Http.Json;
//using guzogo.Data;
//using guzogo.DTOs.Matching;
//using guzogo.Entities;
//using guzogo.Enums;
//using guzogo.Services.Interface;
//using guzogo.Services.Matching;
//using Microsoft.EntityFrameworkCore;

//namespace guzogo.Services.Implementations
//{
//    public class MatchingService : IMatchingService
//    {
//        private readonly ApplicationDbContext _context;
//        private readonly MatchScoreCalculator _scoreCalculator;   // keep for fallback
//        private readonly IHttpClientFactory _httpClientFactory;

//        private static readonly SemaphoreSlim _matchingLock = new SemaphoreSlim(1, 1);

//        public MatchingService(
//            ApplicationDbContext context,
//            MatchScoreCalculator scoreCalculator,
//            IHttpClientFactory httpClientFactory)
//        {
//            _context = context;
//            _scoreCalculator = scoreCalculator;
//            _httpClientFactory = httpClientFactory;
//        }

//        public async Task<MatchResultDto> FindBestMatchAsync(int userId)
//        {
//            // 1. Fast check: already in a session?
//            var existingSession = await GetActiveSessionForUserAsync(userId);
//            if (existingSession != null)
//                return await BuildMatchResultAsync(existingSession, userId);

//            await _matchingLock.WaitAsync();
//            try
//            {
//                existingSession = await GetActiveSessionForUserAsync(userId);
//                if (existingSession != null)
//                    return await BuildMatchResultAsync(existingSession, userId);

//                // 2. Load current user's profile (still needed for session creation)
//                var currentProfile = await _context.Profiles
//                    .Include(p => p.ProfessionTitle)
//                    .Include(p => p.ProfileSkills).ThenInclude(ps => ps.Skill)
//                    .FirstOrDefaultAsync(p => p.UserId == userId);
//                if (currentProfile == null)
//                    return new MatchResultDto { Matched = false };

//                // 3. Load current preference
//                var currentPreference = await _context.MatchPreferences
//                    .FirstOrDefaultAsync(x => x.UserId == userId && x.IsSearching);
//                if (currentPreference == null)
//                    return new MatchResultDto { Matched = false };

//                // 4. Try AI matching first
//                try
//                {
//                    var client = _httpClientFactory.CreateClient("AIMatcher");
//                    var aiResponse = await client.GetFromJsonAsync<AIMatchResponse>($"/match/{userId}");

//                    if (aiResponse?.Matched == true && aiResponse.BestMatch != null)
//                    {
//                        int bestCandidateId = aiResponse.BestMatch.CandidateUserId;

//                        // Ensure candidate is still available
//                        var candidateActive = await _context.MatchSessions
//                            .AnyAsync(s => (s.User1Id == bestCandidateId || s.User2Id == bestCandidateId)
//                                           && s.Status == MatchSessionStatus.Active);
//                        if (!candidateActive)
//                        {
//                            // Create session
//                            var session = new MatchSession
//                            {
//                                User1Id = userId,
//                                User2Id = bestCandidateId,
//                                RoomId = Guid.NewGuid().ToString(),
//                                Status = MatchSessionStatus.Active,
//                                StartedAt = DateTime.UtcNow
//                            };
//                            _context.MatchSessions.Add(session);

//                            // Stop both from searching
//                            currentPreference.IsSearching = false;
//                            var candidatePref = await _context.MatchPreferences
//                                .FirstOrDefaultAsync(p => p.UserId == bestCandidateId);
//                            if (candidatePref != null) candidatePref.IsSearching = false;

//                            await _context.SaveChangesAsync();

//                            // Build and return result
//                            var matchedUser = await BuildMatchedUserDto(bestCandidateId);
//                            return new MatchResultDto
//                            {
//                                Matched = true,
//                                SessionId = session.Id,
//                                RoomId = session.RoomId,
//                                MatchScore = (int)aiResponse.BestMatch.Score,
//                                User = matchedUser
//                            };
//                        }
//                    }
//                }
//                catch (Exception ex)
//                {
//                    // AI service unavailable – fall back to old algorithm
//                    // (could log the exception here)
//                }

//                // 5. Fallback to old scoring algorithm (now using free‑text fields)
//                var candidates = await _context.MatchPreferences
//                    .Where(x => x.IsSearching && x.UserId != userId)
//                    .Include(x => x.User).ThenInclude(u => u.Profile)
//                        .ThenInclude(p => p.ProfileSkills).ThenInclude(ps => ps.Skill)
//                    .Include(x => x.User).ThenInclude(u => u.Profile)
//                        .ThenInclude(p => p.ProfessionTitle)
//                    .ToListAsync();

//                int bestScore = -1;
//                MatchedUserDto? bestUser = null;

//                foreach (var candidatePreference in candidates)
//                {
//                    var candidateProfile = candidatePreference.User.Profile;
//                    if (candidateProfile == null) continue;

//                    int score = _scoreCalculator.CalculateScore(
//                        currentPreference, candidateProfile, candidatePreference);

//                    if (score > bestScore)
//                    {
//                        bestScore = score;
//                        bestUser = new MatchedUserDto
//                        {
//                            UserId = candidateProfile.UserId,
//                            FullName = $"{candidateProfile.FirstName} {candidateProfile.LastName}",
//                            Profession = candidateProfile.ProfessionTitle?.Name ?? "",
//                            ProfilePictureUrl = candidateProfile.ProfilePictureUrl,
//                            Skills = candidateProfile.ProfileSkills.Select(ps => ps.Skill.Name).ToList(),
//                            MatchScore = score
//                        };
//                    }
//                }

//                if (bestUser == null)
//                    return new MatchResultDto { Matched = false };

//                // Ensure candidate not already matched
//                var candidateAlreadyActive = await _context.MatchSessions
//                    .AnyAsync(s => (s.User1Id == bestUser.UserId || s.User2Id == bestUser.UserId)
//                                   && s.Status == MatchSessionStatus.Active);
//                if (candidateAlreadyActive)
//                    return new MatchResultDto { Matched = false };

//                var fallbackSession = new MatchSession
//                {
//                    User1Id = userId,
//                    User2Id = bestUser.UserId,
//                    RoomId = Guid.NewGuid().ToString(),
//                    Status = MatchSessionStatus.Active,
//                    StartedAt = DateTime.UtcNow
//                };
//                _context.MatchSessions.Add(fallbackSession);

//                currentPreference.IsSearching = false;
//                var matchedPref = await _context.MatchPreferences
//                    .FirstOrDefaultAsync(x => x.UserId == bestUser.UserId);
//                if (matchedPref != null) matchedPref.IsSearching = false;

//                await _context.SaveChangesAsync();

//                return new MatchResultDto
//                {
//                    Matched = true,
//                    SessionId = fallbackSession.Id,
//                    MatchScore = bestScore,
//                    User = bestUser,
//                    RoomId = fallbackSession.RoomId
//                };
//            }
//            finally
//            {
//                _matchingLock.Release();
//            }
//        }

//        // ---------- helpers (unchanged) ----------
//        private async Task<MatchSession?> GetActiveSessionForUserAsync(int userId)
//        {
//            return await _context.MatchSessions
//                .FirstOrDefaultAsync(s =>
//                    (s.User1Id == userId || s.User2Id == userId) &&
//                    s.Status == MatchSessionStatus.Active);
//        }

//        private async Task<MatchResultDto> BuildMatchResultAsync(MatchSession session, int currentUserId)
//        {
//            int matchedUserId = session.User1Id == currentUserId
//                ? session.User2Id : session.User1Id;

//            var matchedProfile = await _context.Profiles
//                .Include(p => p.ProfessionTitle)
//                .Include(p => p.ProfileSkills).ThenInclude(ps => ps.Skill)
//                .FirstOrDefaultAsync(p => p.UserId == matchedUserId);

//            return new MatchResultDto
//            {
//                Matched = true,
//                SessionId = session.Id,
//                RoomId = session.RoomId,
//                User = matchedProfile == null ? null : new MatchedUserDto
//                {
//                    UserId = matchedProfile.UserId,
//                    FullName = $"{matchedProfile.FirstName} {matchedProfile.LastName}",
//                    Profession = matchedProfile.ProfessionTitle?.Name ?? "",
//                    ProfilePictureUrl = matchedProfile.ProfilePictureUrl,
//                    Skills = matchedProfile.ProfileSkills.Select(ps => ps.Skill.Name).ToList()
//                }
//            };
//        }

//        private async Task<MatchedUserDto?> BuildMatchedUserDto(int userId)
//        {
//            var profile = await _context.Profiles
//                .Include(p => p.ProfessionTitle)
//                .Include(p => p.ProfileSkills).ThenInclude(ps => ps.Skill)
//                .FirstOrDefaultAsync(p => p.UserId == userId);
//            if (profile == null) return null;

//            return new MatchedUserDto
//            {
//                UserId = profile.UserId,
//                FullName = $"{profile.FirstName} {profile.LastName}",
//                Profession = profile.ProfessionTitle?.Name ?? "",
//                ProfilePictureUrl = profile.ProfilePictureUrl,
//                Skills = profile.ProfileSkills.Select(ps => ps.Skill.Name).ToList()
//            };
//        }
//    }

//    // ---- DTOs for AI response ----
//    public class AIMatchResponse
//    {
//        public bool Matched { get; set; }
//        public AIMatchResult? BestMatch { get; set; }
//        public List<AIMatchResult> Results { get; set; } = new();
//    }

//    public class AIMatchResult
//    {
//        public int CandidateUserId { get; set; }
//        public double Score { get; set; }
//    }
//}
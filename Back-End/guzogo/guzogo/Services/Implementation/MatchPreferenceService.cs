using guzogo.Data;
using guzogo.DTOs.MatchPreference;
using guzogo.Entities;
using guzogo.Services.Interface;
using Microsoft.EntityFrameworkCore;

namespace guzogo.Services.Implementation
{
    public class MatchPreferenceService : IMatchPreferenceService
    {
        private readonly ApplicationDbContext _context;

        public MatchPreferenceService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<MatchPreferenceResponseDto> CreateOrUpdateAsync(
            int userId,
            CreateMatchPreferenceDto dto)
        {
            var preference = await _context.MatchPreferences
                .Include(x => x.PreferenceSkills)
                .FirstOrDefaultAsync(x => x.UserId == userId);

            if (preference == null)
            {
                preference = new MatchPreference
                {
                    UserId = userId,
                    PreferredProfessionId = dto.PreferredProfessionId,
                    Goal = dto.Goal,
                    MatchType = dto.MatchType,
                    CreatedAt = DateTime.UtcNow,
                    IsSearching = dto.IsSearching,

                    PreferenceSkills = dto.PreferredSkillIds
                        .Select(skillId => new PreferenceSkill
                        {
                            SkillId = skillId
                        })
                        .ToList()
                };

                _context.MatchPreferences.Add(preference);
            }
            else
            {
                // Update basic fields
                preference.PreferredProfessionId = dto.PreferredProfessionId;
                preference.Goal = dto.Goal;
                preference.MatchType = dto.MatchType;
                preference.IsSearching = dto.IsSearching;

                // Delete existing skills from the database
                _context.PreferenceSkills.RemoveRange(preference.PreferenceSkills);

                // Replace with the new list
                preference.PreferenceSkills = dto.PreferredSkillIds
                    .Distinct() // Prevent duplicate skill IDs from the frontend
                    .Select(skillId => new PreferenceSkill
                    {
                        SkillId = skillId
                    })
                    .ToList();
            }

            await _context.SaveChangesAsync();

            return new MatchPreferenceResponseDto
            {
                UserId = preference.UserId,
                PreferredProfessionId = preference.PreferredProfessionId,
                PreferredSkillIds = preference.PreferenceSkills
                    .Select(x => x.SkillId)
                    .ToList(),
                Goal = preference.Goal,
                MatchType = preference.MatchType
               
            };
        }

        public async Task<MatchPreferenceResponseDto?> GetAsync(int userId)
        {
            var preference = await _context.MatchPreferences
                .Include(x => x.PreferenceSkills)
                .FirstOrDefaultAsync(x => x.UserId == userId);

            if (preference == null)
                return null;

            return new MatchPreferenceResponseDto
            {
                UserId = preference.UserId,
                PreferredProfessionId = preference.PreferredProfessionId,
                PreferredSkillIds = preference.PreferenceSkills
                    .Select(x => x.SkillId)
                    .ToList(),
                Goal = preference.Goal,
                MatchType = preference.MatchType
            };
        }
    }
}
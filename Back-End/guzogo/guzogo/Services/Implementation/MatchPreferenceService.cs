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

                    // OLD SYSTEM
                    PreferredProfessionId = dto.PreferredProfessionId,

                    // NEW AI SYSTEM
                    DesiredProfession = dto.DesiredProfession,
                    DesiredSkills = dto.DesiredSkills,
                    AdditionalDescription = dto.AdditionalDescription,

                    Goal = dto.Goal,
                    MatchType = dto.MatchType,
                    IsSearching = dto.IsSearching,
                    CreatedAt = DateTime.UtcNow,

                    PreferenceSkills = dto.PreferredSkillIds
                        .Distinct()
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
                // ==========================================
                // OLD SYSTEM
                // ==========================================

                preference.PreferredProfessionId =
                    dto.PreferredProfessionId;

                // ==========================================
                // NEW AI SYSTEM
                // ==========================================

                preference.DesiredProfession =
                    dto.DesiredProfession;

                preference.DesiredSkills =
                    dto.DesiredSkills;

                preference.AdditionalDescription =
                    dto.AdditionalDescription;

                // ==========================================
                // COMMON FIELDS
                // ==========================================

                preference.Goal = dto.Goal;

                preference.MatchType = dto.MatchType;

                preference.IsSearching = dto.IsSearching;

                // ==========================================
                // OLD PREFERRED SKILLS
                // ==========================================

                _context.PreferenceSkills
                    .RemoveRange(preference.PreferenceSkills);

                preference.PreferenceSkills =
                    dto.PreferredSkillIds
                        .Distinct()
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

                // OLD
                PreferredProfessionId =
                    preference.PreferredProfessionId,

                PreferredSkillIds =
                    preference.PreferenceSkills
                        .Select(x => x.SkillId)
                        .ToList(),

                // NEW AI
                DesiredProfession =
                    preference.DesiredProfession,

                DesiredSkills =
                    preference.DesiredSkills,

                AdditionalDescription =
                    preference.AdditionalDescription,

                // COMMON
                Goal = preference.Goal,

                MatchType = preference.MatchType,

                IsSearching = preference.IsSearching
            };
        }

        public async Task<MatchPreferenceResponseDto?> GetAsync(
            int userId)
        {
            var preference = await _context.MatchPreferences
                .Include(x => x.PreferenceSkills)
                .FirstOrDefaultAsync(x => x.UserId == userId);

            if (preference == null)
                return null;

            return new MatchPreferenceResponseDto
            {
                UserId = preference.UserId,

                // OLD
                PreferredProfessionId =
                    preference.PreferredProfessionId,

                PreferredSkillIds =
                    preference.PreferenceSkills
                        .Select(x => x.SkillId)
                        .ToList(),

                // NEW AI
                DesiredProfession =
                    preference.DesiredProfession,

                DesiredSkills =
                    preference.DesiredSkills,

                AdditionalDescription =
                    preference.AdditionalDescription,

                // COMMON
                Goal = preference.Goal,

                MatchType = preference.MatchType,

                IsSearching = preference.IsSearching
            };
        }

        public async Task<List<MatchPreferenceResponseDto>> GetSearchingAsync()
        {
            var preferences = await _context.MatchPreferences
                .Where(x => x.IsSearching)
                .ToListAsync();

            return preferences.Select(preference => new MatchPreferenceResponseDto
            {
                UserId = preference.UserId,

                PreferredProfessionId = preference.PreferredProfessionId,

                PreferredSkillIds = new List<int>(),

                DesiredProfession = preference.DesiredProfession,

                DesiredSkills = preference.DesiredSkills,

                AdditionalDescription = preference.AdditionalDescription,


                Goal = preference.Goal,

                MatchType = preference.MatchType,

                IsSearching = preference.IsSearching
            }).ToList();
        }
    }
}
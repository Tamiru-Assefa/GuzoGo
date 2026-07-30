using guzogo.Data;
using guzogo.DTOs.Skill;
using guzogo.Entities;
using guzogo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace guzogo.Services.Implementation
{
    public class SkillService : ISkillService
    {
        private readonly ApplicationDbContext _context;

        public SkillService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<SkillDto>> GetAllSkillsAsync()
        {
            return await _context.Skills
                .OrderBy(s => s.Name)
                .Select(s => new SkillDto
                {
                    Id = s.Id,
                    Name = s.Name
                })
                .ToListAsync();
        }
        public async Task<bool> AssignSkillsToProfileAsync(int profileId, List<int> skillIds)
        {
            var profile = await _context.Profiles.FindAsync(profileId);

            if (profile == null)
                return false;

            foreach (var skillId in skillIds)
            {
                bool exists = await _context.ProfileSkills
                    .AnyAsync(ps =>
                        ps.ProfileId == profileId &&
                        ps.SkillId == skillId);

                if (!exists)
                {
                    _context.ProfileSkills.Add(new ProfileSkill
                    {
                        ProfileId = profileId,
                        SkillId = skillId
                    });
                }
            }

            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<IEnumerable<SkillDto>> GetProfileSkillsAsync(int profileId)
        {
            return await _context.ProfileSkills
                .Where(ps => ps.ProfileId == profileId)
                .Select(ps => new SkillDto
                {
                    Id = ps.Skill.Id,
                    Name = ps.Skill.Name
                })
                .OrderBy(s => s.Name)
                .ToListAsync();
        }

        public async Task<bool> UpdateProfileSkillsAsync(
    int profileId,
    List<int> skillIds)
        {
            var profileExists = await _context.Profiles
                .AnyAsync(p => p.Id == profileId);

            if (!profileExists)
                return false;


            // Remove old skills
            var existingSkills = await _context.ProfileSkills
                .Where(ps => ps.ProfileId == profileId)
                .ToListAsync();


            _context.ProfileSkills.RemoveRange(existingSkills);


            // Add new skills
            foreach (var skillId in skillIds)
            {
                _context.ProfileSkills.Add(new ProfileSkill
                {
                    ProfileId = profileId,
                    SkillId = skillId
                });
            }


            await _context.SaveChangesAsync();

            return true;
        }
    }
}
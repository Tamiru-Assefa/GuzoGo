using guzogo.DTOs.Skill;

namespace guzogo.Services.Interfaces
{
    public interface ISkillService
    {
        Task<IEnumerable<SkillDto>> GetAllSkillsAsync();
        Task<bool> AssignSkillsToProfileAsync(int profileId, List<int> skillIds);
        Task<IEnumerable<SkillDto>> GetProfileSkillsAsync(int profileId);
        Task<bool> UpdateProfileSkillsAsync(int profileId, List<int> skillIds);
    }
}
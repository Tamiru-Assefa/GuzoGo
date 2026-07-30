using guzogo.DTOs.Experience;

namespace guzogo.Services.Interfaces
{
    public interface IExperienceService
    {
        Task<ExperienceDto> CreateExperienceAsync(
            int profileId,
            CreateExperienceDto dto);


        Task<IEnumerable<ExperienceDto>> GetProfileExperiencesAsync(
            int profileId);


        Task<bool> UpdateExperienceAsync(
            int id,
            CreateExperienceDto dto);


        Task<bool> DeleteExperienceAsync(
            int id);
    }
}
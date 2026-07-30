using guzogo.DTOs.MatchPreference;

namespace guzogo.Services.Interface
{
    public interface IMatchPreferenceService
    {
        Task<MatchPreferenceResponseDto> CreateOrUpdateAsync(
            int userId,
            CreateMatchPreferenceDto dto
        );


        Task<MatchPreferenceResponseDto?> GetAsync(
            int userId
        );
    }
}
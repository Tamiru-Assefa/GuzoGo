using guzogo.DTOs.Matching;

namespace guzogo.Services.Interface
{
    public interface IMatchingService
    {
        Task<MatchResultDto> FindBestMatchAsync(int userId, int? excludeUserId = null);
        Task<bool> EndSessionAsync(int sessionId);

    }
}
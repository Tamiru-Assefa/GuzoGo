using guzogo.DTOs.Presence;

namespace guzogo.Services.Interface
{
    public interface IUserPresenceService
    {
        Task<PresenceResponseDto> UpdateStatusAsync(
            int userId,
            UpdatePresenceDto dto
        );


        Task<PresenceResponseDto?> GetPresenceAsync(
            int userId
        );
    }
}
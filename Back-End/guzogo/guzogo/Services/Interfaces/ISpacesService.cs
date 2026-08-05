using guzogo.DTOs.Spaces;
using guzogo.Entities.Spaces;

namespace guzogo.Services.Interfaces
{
    public interface ISpacesService
    {
        // Category endpoints
        Task<List<RoomCategory>> GetCategoriesAsync();

        // Discovery & Details
        Task<List<RoomCardDto>> GetActiveRoomsAsync(int? categoryId, string? search);
        Task<RoomDetailDto?> GetRoomByIdAsync(int roomId);

        // Room Management
        Task<RoomDetailDto> CreateRoomAsync(int hostUserId, CreateRoomDto dto);
        Task<bool> JoinRoomAsync(int roomId, int userId, JoinRoomDto dto);
        Task<bool> LeaveRoomAsync(int roomId, int userId);
        Task<bool> EndRoomAsync(int roomId, int hostUserId);

        // Host Moderation Actions
        Task<bool> KickParticipantAsync(int roomId, int hostUserId, int targetUserId);
        Task<bool> ToggleMuteParticipantAsync(int roomId, int hostUserId, int targetUserId, bool isMuted);
        // Media State Sync
        Task<bool> ToggleParticipantMediaAsync(int roomId, int userId, ToggleMediaDto dto);

        // Chat Messages
        Task<List<RoomMessageDto>> GetRoomMessagesAsync(int roomId, int limit = 50);
        Task<RoomMessageDto?> SendRoomMessageAsync(int roomId, int userId, string content);

        // Token Generation placeholder (e.g., LiveKit / Agora / Custom WebRTC token)
        Task<string> GenerateMediaTokenAsync(int roomId, int userId);
        Task UpdateParticipantMediaStateAsync(int roomId, int userId, UpdateMediaStateDto dto);
    }
}
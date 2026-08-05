using BCrypt.Net;
using guzogo.Data;
using guzogo.DTOs.Spaces;
using guzogo.Entities;
using guzogo.Entities.Spaces;
using guzogo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace guzogo.Services.Implementation
{
    public class SpacesService : ISpacesService
    {
        private readonly ApplicationDbContext _context;

        public SpacesService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<RoomCategory>> GetCategoriesAsync()
        {
            return await _context.RoomCategories.AsNoTracking().ToListAsync();
        }

        public async Task<List<RoomCardDto>> GetActiveRoomsAsync(int? categoryId, string? search)
        {
            var query = _context.Rooms
                .AsNoTracking()
                .Where(r => r.IsActive);

            if (categoryId.HasValue && categoryId.Value > 0)
            {
                query = query.Where(r => r.CategoryId == categoryId.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(r => r.Title.ToLower().Contains(term));
            }

            return await query
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new RoomCardDto
                {
                    Id = r.Id,
                    Title = r.Title,
                    CategoryId = r.CategoryId,
                    CategoryName = r.Category != null ? r.Category.Name : "General",
                    HostUserId = r.HostUserId,
                    HostFullName = r.HostUser != null && r.HostUser.Profile != null
                        ? $"{r.HostUser.Profile.FirstName} {r.HostUser.Profile.LastName}".Trim()
                        : "Unknown Host",
                    HostProfilePictureUrl = r.HostUser != null && r.HostUser.Profile != null
                        ? r.HostUser.Profile.ProfilePictureUrl
                        : null,
                    IsPublic = r.IsPublic,
                    MaxParticipants = r.MaxParticipants,
                    ActiveParticipantCount = r.Participants.Count(p => p.LeftAt == null),
                    AllowVideo = r.AllowVideo,
                    AllowScreenShare = r.AllowScreenShare,

                    // Filter out null or empty avatar URLs so Angular receives clean image strings
                    ParticipantAvatars = r.Participants
                        .Where(p => p.LeftAt == null && p.User != null && p.User.Profile != null && !string.IsNullOrEmpty(p.User.Profile.ProfilePictureUrl))
                        .Take(4)
                        .Select(p => p.User!.Profile!.ProfilePictureUrl!)
                        .ToList()
                })
                .ToListAsync();
        }

        public async Task<RoomDetailDto?> GetRoomByIdAsync(int roomId)
        {
            return await _context.Rooms
                .AsNoTracking()
                .Where(r => r.Id == roomId && r.IsActive)
                .Select(r => new RoomDetailDto
                {
                    Id = r.Id,
                    Title = r.Title,
                    CategoryId = r.CategoryId,
                    CategoryName = r.Category != null ? r.Category.Name : "General",
                    HostUserId = r.HostUserId,
                    HostFullName = r.HostUser != null && r.HostUser.Profile != null
                        ? $"{r.HostUser.Profile.FirstName} {r.HostUser.Profile.LastName}".Trim()
                        : "Unknown Host",
                    IsPublic = r.IsPublic,
                    MaxParticipants = r.MaxParticipants,
                    AllowVideo = r.AllowVideo,
                    AllowScreenShare = r.AllowScreenShare,
                    Participants = r.Participants
                        .Where(p => p.LeftAt == null)
                        .Select(p => new RoomParticipantDto
                        {
                            UserId = p.UserId,
                            FullName = p.User != null && p.User.Profile != null
                                ? $"{p.User.Profile.FirstName} {p.User.Profile.LastName}".Trim()
                                : "Unknown User",
                            ProfilePictureUrl = p.User != null && p.User.Profile != null ? p.User.Profile.ProfilePictureUrl : null,
                            Profession = p.User != null && p.User.Profile != null && p.User.Profile.ProfessionTitle != null
                                ? p.User.Profile.ProfessionTitle.Name
                                : "",
                            IsHost = p.UserId == r.HostUserId,
                            IsMuted = p.IsMuted,
                            IsMutedByHost = p.IsMutedByHost,
                            IsVideoOn = p.IsVideoOn,
                            IsScreenSharing = p.IsScreenSharing,
                            IsHandRaised = p.IsHandRaised
                        })
                        .ToList()
                })
                .FirstOrDefaultAsync();
        }

        public async Task<RoomDetailDto> CreateRoomAsync(int hostUserId, CreateRoomDto dto)
        {
            var room = new Room
            {
                Title = dto.Title,
                CategoryId = dto.CategoryId,
                HostUserId = hostUserId,
                IsPublic = dto.IsPublic,
                PasswordHash = !dto.IsPublic && !string.IsNullOrEmpty(dto.Password)
                    ? BCrypt.Net.BCrypt.HashPassword(dto.Password)
                    : null,
                MaxParticipants = dto.MaxParticipants,
                AllowVideo = dto.AllowVideo,
                AllowScreenShare = dto.AllowScreenShare,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.Rooms.Add(room);
            await _context.SaveChangesAsync();

            // Automatically add Host as the first active participant
            var hostParticipant = new RoomParticipant
            {
                RoomId = room.Id,
                UserId = hostUserId,
                JoinedAt = DateTime.UtcNow
            };

            _context.RoomParticipants.Add(hostParticipant);
            await _context.SaveChangesAsync();

            return (await GetRoomByIdAsync(room.Id))!;
        }

        public async Task<bool> JoinRoomAsync(int roomId, int userId, JoinRoomDto dto)
        {
            var room = await _context.Rooms
                .Include(r => r.Participants.Where(p => p.LeftAt == null))
                .FirstOrDefaultAsync(r => r.Id == roomId && r.IsActive);

            if (room == null) return false;

            // 1. Check if user is banned
            var isBanned = await _context.RoomBannedUsers
                .AnyAsync(b => b.RoomId == roomId && b.UserId == userId);
            if (isBanned) return false;

            // 2. If already active participant, return true immediately
            var isAlreadyInRoom = room.Participants.Any(p => p.UserId == userId);
            if (isAlreadyInRoom) return true;

            // 3. Check max capacity
            if (room.Participants.Count >= room.MaxParticipants) return false;

            // 4. Check password for private rooms
            if (!room.IsPublic && !string.IsNullOrEmpty(room.PasswordHash))
            {
                if (string.IsNullOrEmpty(dto.Password) || !BCrypt.Net.BCrypt.Verify(dto.Password, room.PasswordHash))
                {
                    return false;
                }
            }

            // 5. Add new active session
            _context.RoomParticipants.Add(new RoomParticipant
            {
                RoomId = roomId,
                UserId = userId,
                JoinedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> LeaveRoomAsync(int roomId, int userId)
        {
            var participant = await _context.RoomParticipants
                .FirstOrDefaultAsync(p => p.RoomId == roomId && p.UserId == userId && p.LeftAt == null);

            if (participant == null) return false;

            participant.LeftAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> EndRoomAsync(int roomId, int hostUserId)
        {
            var room = await _context.Rooms.FirstOrDefaultAsync(r => r.Id == roomId && r.HostUserId == hostUserId);
            if (room == null) return false;

            room.IsActive = false;
            room.EndedAt = DateTime.UtcNow;

            // Optionally mark active participants as left
            var activeParticipants = await _context.RoomParticipants
                .Where(p => p.RoomId == roomId && p.LeftAt == null)
                .ToListAsync();

            foreach (var p in activeParticipants)
            {
                p.LeftAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> KickParticipantAsync(int roomId, int hostUserId, int targetUserId)
        {
            var room = await _context.Rooms.FirstOrDefaultAsync(r => r.Id == roomId && r.HostUserId == hostUserId);
            if (room == null) return false;

            var participant = await _context.RoomParticipants
                .FirstOrDefaultAsync(p => p.RoomId == roomId && p.UserId == targetUserId && p.LeftAt == null);

            if (participant != null)
            {
                participant.LeftAt = DateTime.UtcNow;
            }

            var alreadyBanned = await _context.RoomBannedUsers
                .AnyAsync(b => b.RoomId == roomId && b.UserId == targetUserId);

            if (!alreadyBanned)
            {
                _context.RoomBannedUsers.Add(new RoomBannedUser
                {
                    RoomId = roomId,
                    UserId = targetUserId,
                    BannedAt = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ToggleMuteParticipantAsync(int roomId, int hostUserId, int targetUserId, bool isMuted)
        {
            var room = await _context.Rooms.FirstOrDefaultAsync(r => r.Id == roomId && r.HostUserId == hostUserId);
            if (room == null) return false;

            var participant = await _context.RoomParticipants
                .FirstOrDefaultAsync(p => p.RoomId == roomId && p.UserId == targetUserId && p.LeftAt == null);

            if (participant == null) return false;

            participant.IsMuted = isMuted;
            participant.IsMutedByHost = isMuted;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ToggleParticipantMediaAsync(int roomId, int userId, ToggleMediaDto dto)
        {
            var participant = await _context.RoomParticipants
                .FirstOrDefaultAsync(p => p.RoomId == roomId && p.UserId == userId && p.LeftAt == null);

            if (participant == null) return false;

            if (dto.IsMuted.HasValue) participant.IsMuted = dto.IsMuted.Value;
            if (dto.IsVideoOn.HasValue) participant.IsVideoOn = dto.IsVideoOn.Value;
            if (dto.IsScreenSharing.HasValue) participant.IsScreenSharing = dto.IsScreenSharing.Value;
            if (dto.IsHandRaised.HasValue) participant.IsHandRaised = dto.IsHandRaised.Value;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<List<RoomMessageDto>> GetRoomMessagesAsync(int roomId, int limit = 50)
        {
            return await _context.RoomMessages
                .AsNoTracking()
                .Where(m => m.RoomId == roomId)
                .OrderByDescending(m => m.SentAt)
                .Take(limit)
                .OrderBy(m => m.SentAt)
                .Select(m => new RoomMessageDto
                {
                    Id = m.Id,
                    RoomId = m.RoomId,
                    SenderUserId = m.SenderUserId,
                    SenderFullName = m.SenderUser != null && m.SenderUser.Profile != null
                        ? $"{m.SenderUser.Profile.FirstName} {m.SenderUser.Profile.LastName}".Trim()
                        : "Unknown",
                    SenderProfilePictureUrl = m.SenderUser != null && m.SenderUser.Profile != null
                        ? m.SenderUser.Profile.ProfilePictureUrl
                        : null,
                    Content = m.Content,
                    SentAt = m.SentAt
                })
                .ToListAsync();
        }

        public async Task<RoomMessageDto?> SendRoomMessageAsync(int roomId, int userId, string content)
        {
            var isParticipant = await _context.RoomParticipants
                .AnyAsync(p => p.RoomId == roomId && p.UserId == userId && p.LeftAt == null);

            if (!isParticipant) return null;

            var message = new RoomMessage
            {
                RoomId = roomId,
                SenderUserId = userId,
                Content = content,
                SentAt = DateTime.UtcNow
            };

            _context.RoomMessages.Add(message);
            await _context.SaveChangesAsync();

            var profile = await _context.Profiles
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.UserId == userId);

            return new RoomMessageDto
            {
                Id = message.Id,
                RoomId = message.RoomId,
                SenderUserId = message.SenderUserId,
                SenderFullName = profile != null ? $"{profile.FirstName} {profile.LastName}".Trim() : "Unknown",
                SenderProfilePictureUrl = profile?.ProfilePictureUrl,
                Content = message.Content,
                SentAt = message.SentAt
            };
        }
        public async Task UpdateParticipantMediaStateAsync(int roomId, int userId, UpdateMediaStateDto dto)
        {
            var participant = await _context.RoomParticipants
                .FirstOrDefaultAsync(p => p.RoomId == roomId && p.UserId == userId && p.LeftAt == null);

            if (participant != null)
            {
                if (dto.IsMuted.HasValue) participant.IsMuted = dto.IsMuted.Value;
                if (dto.IsVideoOn.HasValue) participant.IsVideoOn = dto.IsVideoOn.Value;
                if (dto.IsScreenSharing.HasValue) participant.IsScreenSharing = dto.IsScreenSharing.Value;
                if (dto.IsHandRaised.HasValue) participant.IsHandRaised = dto.IsHandRaised.Value;

                await _context.SaveChangesAsync();
            }
        }

        public async Task<string> GenerateMediaTokenAsync(int roomId, int userId)
        {
            await Task.CompletedTask;
            return $"mock-media-token-for-room-{roomId}-user-{userId}";
        }
    }
}
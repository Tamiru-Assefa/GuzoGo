using guzogo.Data;
using guzogo.DTOs.Presence;
using guzogo.Entities;
using guzogo.Services.Interface;
using Microsoft.EntityFrameworkCore;

namespace guzogo.Services.Implementation
{
    public class UserPresenceService : IUserPresenceService
    {
        private readonly ApplicationDbContext _context;

        
        public UserPresenceService(ApplicationDbContext context)
        {
            _context = context;
        }



        public async Task<PresenceResponseDto> UpdateStatusAsync(
            int userId,
            UpdatePresenceDto dto)
        {

            var presence = await _context.UserPresences
                .FirstOrDefaultAsync(x => x.UserId == userId);



            if (presence == null)
            {
                presence = new UserPresence
                {
                    UserId = userId,
                    Status = dto.Status,
                    LastSeen = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };


                _context.UserPresences.Add(presence);
            }
            else
            {
                presence.Status = dto.Status;
                presence.LastSeen = DateTime.UtcNow;
                presence.UpdatedAt = DateTime.UtcNow;
            }



            await _context.SaveChangesAsync();



            return new PresenceResponseDto
            {
                UserId = presence.UserId,
                Status = presence.Status,
                LastSeen = presence.LastSeen
            };
        }



        public async Task<PresenceResponseDto?> GetPresenceAsync(
            int userId)
        {

            var presence = await _context.UserPresences
                .FirstOrDefaultAsync(x => x.UserId == userId);



            if (presence == null)
                return null;



            return new PresenceResponseDto
            {
                UserId = presence.UserId,
                Status = presence.Status,
                LastSeen = presence.LastSeen
            };
        }
    }
}
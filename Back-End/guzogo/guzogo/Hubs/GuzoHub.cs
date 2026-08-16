using System;
using System.Security.Claims;
using System.Threading.Tasks;
using guzogo.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace guzogo.Hubs
{
    [Authorize]
    public class GuzoHub : Hub
    {
        private readonly ApplicationDbContext _context;

        public GuzoHub(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task JoinRoom(string roomId)
        {
            var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
            {
                throw new HubException("User not authenticated.");
            }

            int userId = int.Parse(userIdClaim.Value);

            var session = await _context.MatchSessions
                .FirstOrDefaultAsync(x =>
                    x.RoomId == roomId &&
                    (x.User1Id == userId || x.User2Id == userId));

            if (session == null)
            {
                throw new HubException("You are not authorized to join this room.");
            }

            await Groups.AddToGroupAsync(Context.ConnectionId, roomId);

            // Notify others in room that this user has joined
            await Clients.OthersInGroup(roomId).SendAsync("UserJoined", userId);
        }

        public async Task LeaveRoom(string roomId)
        {
            var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier);
            string userId = userIdClaim?.Value ?? Context.ConnectionId;

            await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);
            await Clients.OthersInGroup(roomId).SendAsync("UserLeft", userId);
        }

        public async Task SendSignal(string roomId, string targetUserId, string signalData)
        {
            var senderIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier);
            string senderUserId = senderIdClaim?.Value ?? Context.ConnectionId;

            // Broadcast to the other peer in the room with explicit sender ID
            await Clients.OthersInGroup(roomId).SendAsync("ReceiveSignal", senderUserId, signalData);
        }

        public async Task SendMessage(string roomId, string message)
        {
            var userName = Context.User?.FindFirst(ClaimTypes.Name)?.Value ?? "Peer";
            await Clients.Group(roomId).SendAsync("ReceiveMessage", userName, message, DateTime.UtcNow);
        }
    }
}
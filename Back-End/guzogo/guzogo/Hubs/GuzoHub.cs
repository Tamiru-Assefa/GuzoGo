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
            var userIdClaim = Context.User?
                .FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);


            if (userIdClaim == null)
            {
                throw new HubException("User not authenticated.");
            }


            int userId = int.Parse(userIdClaim.Value);



            var session = await _context.MatchSessions
                .FirstOrDefaultAsync(x =>
                    x.RoomId == roomId &&
                    (x.User1Id == userId ||
                     x.User2Id == userId));



            if (session == null)
            {
                throw new HubException(
                    "You are not allowed to join this room.");
            }



            await Groups.AddToGroupAsync(
                Context.ConnectionId,
                roomId);



            await Clients.Group(roomId)
                .SendAsync(
                    "UserJoined",
                    userId);
        }

        public async Task LeaveRoom(string roomId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);

            await Clients.Group(roomId).SendAsync(
                "UserLeft",
                Context.ConnectionId);
        }
        public async Task SendMessage(
            string roomId,
            string message)
        {
            var userName = Context.User?
                .FindFirst(System.Security.Claims.ClaimTypes.Name)
                ?.Value;


            if (userName == null)
            {
                throw new HubException("User information missing.");
            }


            await Clients.Group(roomId)
                .SendAsync(
                    "ReceiveMessage",
                    userName,
                    message,
                    DateTime.UtcNow);
        }

        public async Task SendSignal(
            string roomId,
            string signalType,
            string data)
        {
            await Clients.OthersInGroup(roomId)
                .SendAsync(
                    "ReceiveSignal",
                    signalType,
                    data);
        }
    }
}
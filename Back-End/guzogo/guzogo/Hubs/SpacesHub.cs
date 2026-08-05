using guzogo.DTOs.Spaces;
using guzogo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace guzogo.Hubs
{
    [Authorize]
    public class SpacesHub : Hub
    {
        private readonly ISpacesService _spacesService;

        public SpacesHub(ISpacesService spacesService)
        {
            _spacesService = spacesService;
        }

        // Join live socket group
        
        public async Task JoinSpaceGroup(int roomId)
        {
            Console.WriteLine("JoinSpaceGroup called");

            var groupName = $"Space_{roomId}";

            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);

            Console.WriteLine("Added to group");

            await Clients.OthersInGroup(groupName)
                .SendAsync("UserJoinedSpace", Context.UserIdentifier);
        }

        // Leave live socket group
        public async Task LeaveSpaceGroup(int roomId)
        {
            var groupName = $"Space_{roomId}";
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
            await Clients.OthersInGroup(groupName).SendAsync("UserLeftSpace", Context.UserIdentifier);
        }

        // --- Real-time Chat ---
        public async Task SendMessage(int roomId, string content)
        {
            var userId = Context.UserIdentifier;
            if (string.IsNullOrEmpty(userId) || string.IsNullOrWhiteSpace(content)) return;

            // Optional: Persist to DB directly through service if not using HTTP endpoint
            // var messageDto = await _spacesService.SaveMessageAsync(roomId, int.Parse(userId), content);

            // Broadcast message to everyone in the space
            await Clients.Group($"Space_{roomId}").SendAsync("ReceiveMessage", new
            {
                roomId,
                senderUserId = userId,
                content,
                sentAt = DateTime.UtcNow
            });
        }

        // --- Live Toggle State Broadcasts (Mute, Video, Hand Raise) ---
        public async Task ToggleMediaState(int roomId, UpdateMediaStateDto dto)
        {
            var userIdStr = Context.UserIdentifier;
            if (int.TryParse(userIdStr, out int userId))
            {
                // 1. Persist state change into DB
                await _spacesService.UpdateParticipantMediaStateAsync(roomId, userId, dto);

                // 2. Broadcast updated state to all participants in room
                await Clients.Group($"Space_{roomId}").SendAsync("SpaceStateUpdated", new
                {
                    userId,
                    mediaState = dto
                });
            }
        }

        // --- WebRTC Signaling (Offer / Answer / ICE Candidates) ---
        public async Task SendSignal(int roomId, string targetUserId, string signalData)
        {
            await Clients.User(targetUserId).SendAsync("ReceiveSignal", Context.UserIdentifier, signalData);
        }

        public override async Task OnConnectedAsync()
        {
            Console.WriteLine($"Connected: {Context.UserIdentifier}");

            await base.OnConnectedAsync();
        }
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            Console.WriteLine($"Disconnected: {Context.UserIdentifier}");

            await base.OnDisconnectedAsync(exception);
        }

    }
}
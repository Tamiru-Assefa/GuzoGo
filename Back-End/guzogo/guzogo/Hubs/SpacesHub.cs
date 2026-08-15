using System.Collections.Concurrent;
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

        // Map RoomId -> Set of Active User IDs (Thread-safe)
        private static readonly ConcurrentDictionary<int, ConcurrentDictionary<string, byte>> RoomUsers = new();

        // Map ConnectionId -> (RoomId, UserId) for reliable disconnect cleanup
        private static readonly ConcurrentDictionary<string, (int RoomId, string UserId)> ConnectionMap = new();

        public SpacesHub(ISpacesService spacesService)
        {
            _spacesService = spacesService;
        }

        /// <summary>
        /// Joins a space group, registers the user, and returns existing connected users.
        /// </summary>
        public async Task<List<string>> JoinSpaceGroup(int roomId)
        {
            var userId = Context.UserIdentifier;
            if (string.IsNullOrEmpty(userId))
            {
                return new List<string>();
            }

            var groupName = $"Space_{roomId}";
            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);

            // Track connection
            ConnectionMap[Context.ConnectionId] = (roomId, userId);

            // Register user in room
            var usersInRoom = RoomUsers.GetOrAdd(roomId, _ => new ConcurrentDictionary<string, byte>());

            // Get all other existing users in this room BEFORE adding current user
            var existingUsers = usersInRoom.Keys.Where(id => id != userId).ToList();

            usersInRoom.TryAdd(userId, 0);

            // Notify other participants that a new user has joined
            await Clients.OthersInGroup(groupName).SendAsync("UserJoinedSpace", userId);

            return existingUsers;
        }

        /// <summary>
        /// Leaves the space group and informs peers.
        /// </summary>
        public async Task LeaveSpaceGroup(int roomId)
        {
            var userId = Context.UserIdentifier;
            var groupName = $"Space_{roomId}";

            await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
            ConnectionMap.TryRemove(Context.ConnectionId, out _);

            if (!string.IsNullOrEmpty(userId) && RoomUsers.TryGetValue(roomId, out var usersInRoom))
            {
                usersInRoom.TryRemove(userId, out _);
                if (usersInRoom.IsEmpty)
                {
                    RoomUsers.TryRemove(roomId, out _);
                }
            }

            if (!string.IsNullOrEmpty(userId))
            {
                await Clients.OthersInGroup(groupName).SendAsync("UserLeftSpace", userId);
            }
        }

        // --- Real-time Chat ---
        public async Task SendMessage(int roomId, string content)
        {
            var userId = Context.UserIdentifier;
            if (string.IsNullOrEmpty(userId) || string.IsNullOrWhiteSpace(content)) return;

            await Clients.Group($"Space_{roomId}").SendAsync("ReceiveMessage", new
            {
                roomId,
                senderUserId = userId,
                content,
                sentAt = DateTime.UtcNow
            });
        }

        // --- Live Media State Synchronization ---
        public async Task ToggleMediaState(int roomId, UpdateMediaStateDto dto)
        {
            var userIdStr = Context.UserIdentifier;
            if (int.TryParse(userIdStr, out int userId))
            {
                await _spacesService.UpdateParticipantMediaStateAsync(roomId, userId, dto);

                await Clients.Group($"Space_{roomId}").SendAsync("SpaceStateUpdated", new
                {
                    userId,
                    mediaState = dto
                });
            }
        }

        // --- WebRTC Signaling Relay ---
        public async Task SendSignal(int roomId, string targetUserId, object signalData)
        {
            var fromUserId = Context.UserIdentifier;
            if (!string.IsNullOrEmpty(fromUserId) && !string.IsNullOrEmpty(targetUserId))
            {
                await Clients.User(targetUserId).SendAsync("ReceiveSignal", fromUserId, signalData);
            }
        }

        public override async Task OnConnectedAsync()
        {
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            if (ConnectionMap.TryRemove(Context.ConnectionId, out var info))
            {
                var (roomId, userId) = info;
                if (RoomUsers.TryGetValue(roomId, out var usersInRoom))
                {
                    usersInRoom.TryRemove(userId, out _);
                    if (usersInRoom.IsEmpty)
                    {
                        RoomUsers.TryRemove(roomId, out _);
                    }
                }

                await Clients.Group($"Space_{roomId}").SendAsync("UserLeftSpace", userId);
            }

            await base.OnDisconnectedAsync(exception);
        }
    }
}
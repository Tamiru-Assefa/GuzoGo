using System.Security.Claims;
using guzogo.DTOs.Spaces;
using guzogo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace guzogo.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SpacesController : ControllerBase
    {
        private readonly ISpacesService _spacesService;

        public SpacesController(ISpacesService spacesService)
        {
            _spacesService = spacesService;
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.Parse(userIdClaim!);
        }

        [HttpGet("categories")]
        [AllowAnonymous]
        public async Task<IActionResult> GetCategories()
        {
            var categories = await _spacesService.GetCategoriesAsync();
            return Ok(categories);
        }

        [HttpGet]
        public async Task<IActionResult> GetActiveRooms([FromQuery] int? categoryId, [FromQuery] string? search)
        {
            var rooms = await _spacesService.GetActiveRoomsAsync(categoryId, search);
            return Ok(rooms);
        }

        [HttpGet("{roomId}")]
        public async Task<IActionResult> GetRoomById(int roomId)
        {
            var room = await _spacesService.GetRoomByIdAsync(roomId);
            if (room == null) return NotFound("Room not found or inactive.");
            return Ok(room);
        }

        [HttpPost]
        public async Task<IActionResult> CreateRoom([FromBody] CreateRoomDto dto)
        {
            Console.WriteLine("===== USER =====");

            Console.WriteLine(User.Identity?.IsAuthenticated);

            foreach (var claim in User.Claims)
            {
                Console.WriteLine($"{claim.Type} = {claim.Value}");
            }

            Console.WriteLine("================");
            int userId = GetCurrentUserId();
            var room = await _spacesService.CreateRoomAsync(userId, dto);
            return CreatedAtAction(nameof(GetRoomById), new { roomId = room.Id }, room);
        }


        [HttpPost("{roomId}/join")]
        public async Task<IActionResult> JoinRoom(int roomId, [FromBody] JoinRoomDto dto)
        {
            int userId = GetCurrentUserId();
            var success = await _spacesService.JoinRoomAsync(roomId, userId, dto);

            if (!success)
                return BadRequest("Unable to join room. Verify password, capacity, or ban status.");

            return Ok(new { Message = "Joined successfully." });
        }

        [HttpPost("{roomId}/leave")]
        public async Task<IActionResult> LeaveRoom(int roomId)
        {
            int userId = GetCurrentUserId();
            await _spacesService.LeaveRoomAsync(roomId, userId);
            return Ok(new { Message = "Left room successfully." });
        }

        [HttpDelete("{roomId}")]
        public async Task<IActionResult> EndRoom(int roomId)
        {
            int userId = GetCurrentUserId();
            var success = await _spacesService.EndRoomAsync(roomId, userId);
            if (!success) return Forbid();

            return Ok(new { Message = "Room closed successfully." });
        }

        [HttpPost("{roomId}/kick/{targetUserId}")]
        public async Task<IActionResult> KickParticipant(int roomId, int targetUserId)
        {
            int hostUserId = GetCurrentUserId();
            var success = await _spacesService.KickParticipantAsync(roomId, hostUserId, targetUserId);
            if (!success) return BadRequest("Only the host can kick participants.");

            return Ok(new { Message = "User kicked and banned from room." });
        }

        [HttpPost("{roomId}/mute/{targetUserId}")]
        public async Task<IActionResult> MuteParticipant(int roomId, int targetUserId, [FromQuery] bool isMuted = true)
        {
            int hostUserId = GetCurrentUserId();
            var success = await _spacesService.ToggleMuteParticipantAsync(roomId, hostUserId, targetUserId, isMuted);
            if (!success) return BadRequest("Failed to update mute state.");

            return Ok(new { Message = $"User mute status updated to {isMuted}." });
        }

        [HttpPost("{roomId}/toggle-media")]
        public async Task<IActionResult> ToggleMedia(int roomId, [FromBody] ToggleMediaDto dto)
        {
            int userId = GetCurrentUserId();
            var success = await _spacesService.ToggleParticipantMediaAsync(roomId, userId, dto);
            if (!success) return BadRequest("Active participant not found in this room.");

            return Ok(new { Message = "Media state updated successfully." });
        }

        [HttpGet("{roomId}/messages")]
        public async Task<IActionResult> GetMessages(int roomId, [FromQuery] int limit = 50)
        {
            var messages = await _spacesService.GetRoomMessagesAsync(roomId, limit);
            return Ok(messages);
        }

        [HttpPost("{roomId}/messages")]
        public async Task<IActionResult> SendMessage(int roomId, [FromBody] CreateRoomMessageDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Content)) return BadRequest("Message content cannot be empty.");

            int userId = GetCurrentUserId();
            var message = await _spacesService.SendRoomMessageAsync(roomId, userId, dto.Content);
            if (message == null) return BadRequest("You must be an active participant to send messages.");

            return Ok(message);
        }

        [HttpPost("{roomId}/token")]
        public async Task<IActionResult> GetMediaToken(int roomId)
        {
            int userId = GetCurrentUserId();
            var token = await _spacesService.GenerateMediaTokenAsync(roomId, userId);
            return Ok(new { Token = token });
        }
    }
}
using guzogo.DTOs.Presence;
using guzogo.Services.Interface;
using Microsoft.AspNetCore.Mvc;

namespace guzogo.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PresenceController : ControllerBase
    {
        private readonly IUserPresenceService _presenceService;


        public PresenceController(IUserPresenceService presenceService)
        {
            _presenceService = presenceService;
        }



        // Update user status
        [HttpPut("{userId}")]
        public async Task<IActionResult> UpdateStatus(
            int userId,
            UpdatePresenceDto dto)
        {
            var result = await _presenceService
                .UpdateStatusAsync(userId, dto);


            return Ok(result);
        }




        // Get user presence
        [HttpGet("{userId}")]
        public async Task<IActionResult> GetPresence(
            int userId)
        {
            var result = await _presenceService
                .GetPresenceAsync(userId);


            if (result == null)
                return NotFound("User presence not found");


            return Ok(result);
        }
    }
}
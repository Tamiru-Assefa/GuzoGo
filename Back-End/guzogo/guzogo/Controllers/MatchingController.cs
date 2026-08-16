using Microsoft.AspNetCore.Mvc;
using guzogo.DTOs.Matching;
using guzogo.Services.Interface;

namespace guzogo.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MatchingController : ControllerBase
    {
        private readonly IMatchingService _matchingService;

        public MatchingController(IMatchingService matchingService)
        {
            _matchingService = matchingService;
        }

        [HttpPost("find/{userId}")]
        public async Task<IActionResult> FindMatch(int userId, [FromBody] FindMatchRequest? request)
        {
            var result = await _matchingService.FindBestMatchAsync(userId, request?.ExcludeUserId);
            if (result == null || !result.Matched)
            {
                return NotFound(new { matched = false, message = "No match found currently in queue" });
            }

            return Ok(result);
        }

        [HttpPost("end/{sessionId}")]
        public async Task<IActionResult> EndSession(int sessionId)
        {
            await _matchingService.EndSessionAsync(sessionId);
            return Ok(new { success = true });
        }
    }
}
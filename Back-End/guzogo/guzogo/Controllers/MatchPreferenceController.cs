using guzogo.DTOs.MatchPreference;
using guzogo.Services.Interface;
using Microsoft.AspNetCore.Mvc;

namespace guzogo.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MatchPreferenceController : ControllerBase
    {
        private readonly IMatchPreferenceService _matchPreferenceService;

        public MatchPreferenceController(IMatchPreferenceService matchPreferenceService)
        {
            _matchPreferenceService = matchPreferenceService;
        }

        // Create or Update Match Preference
        [HttpPost("{userId}")]
        public async Task<IActionResult> CreateOrUpdate(
            int userId,
            CreateMatchPreferenceDto dto)
        {
            var result = await _matchPreferenceService
                .CreateOrUpdateAsync(userId, dto);

            return Ok(result);
        }

        // Get Match Preference
        [HttpGet("{userId}")]
        public async Task<IActionResult> Get(int userId)
        {
            var result = await _matchPreferenceService
                .GetAsync(userId);

            if (result == null)
                return NotFound("Match preference not found.");

            return Ok(result);
        }

        [HttpGet("searching")]
        public async Task<IActionResult> GetSearching()
        {
            var preferences = await _matchPreferenceService.GetSearchingAsync();

            return Ok(preferences);
        }
    }
}
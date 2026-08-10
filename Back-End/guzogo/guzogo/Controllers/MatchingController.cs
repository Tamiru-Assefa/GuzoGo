using guzogo.Services.Interface;
using Microsoft.AspNetCore.Mvc;

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
        public async Task<IActionResult> FindMatch(int userId)
        {
            var result = await _matchingService.FindBestMatchAsync(userId);

            return Ok(result);
        }
    }
}
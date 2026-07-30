using guzogo.Services.Interface;
using Microsoft.AspNetCore.Mvc;

namespace guzogo.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MatchSessionController : ControllerBase
    {
        private readonly IMatchSessionService _matchSessionService;


        public MatchSessionController(
            IMatchSessionService matchSessionService)
        {
            _matchSessionService = matchSessionService;
        }



        [HttpPost("end/{sessionId}")]
        public async Task<IActionResult> EndSession(int sessionId)
        {
            var result = await _matchSessionService
                .EndSessionAsync(sessionId);


            if (!result)
            {
                return NotFound(new
                {
                    message = "Match session not found."
                });
            }


            return Ok(new
            {
                message = "Match session ended successfully."
            });
        }
    }
}
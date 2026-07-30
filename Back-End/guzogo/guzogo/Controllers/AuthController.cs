using guzogo.DTOs.Auth;
using guzogo.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace guzogo.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {

        private readonly IAuthService _authService;


        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }



        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterDto registerDto)
        {
            var result = await _authService.RegisterAsync(registerDto);


            if (!result)
            {
                return BadRequest(new
                {
                    message = "Email already exists"
                });
            }


            return Ok(new
            {
                message = "User registered successfully"
            });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginDto loginDto)
        {
            var result = await _authService.LoginAsync(loginDto);

            if (result == null)
            {
                return Unauthorized(new
                {
                    message = "Invalid email or password."
                });
            }

            return Ok(result);
        }
    }
}
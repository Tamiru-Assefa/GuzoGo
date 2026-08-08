using guzogo.Data;
using guzogo.DTOs.Auth;
using guzogo.Entities;
using guzogo.Helpers;
using guzogo.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace guzogo.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly ApplicationDbContext _context;
        private readonly JwtTokenGenerator _jwtTokenGenerator;

        public AuthController(
            IAuthService authService,
            ApplicationDbContext context,
            JwtTokenGenerator jwtTokenGenerator)
        {
            _authService = authService;
            _context = context;
            _jwtTokenGenerator = jwtTokenGenerator;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto registerDto)
        {
            var success = await _authService.RegisterAsync(registerDto);
            if (!success)
                return BadRequest(new { message = "Registration failed. Email may already exist." });
            return Ok(new { message = "Registration successful." });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto loginDto)
        {
            var response = await _authService.LoginAsync(loginDto);
            if (response == null)
                return Unauthorized("Invalid credentials.");
            return Ok(response);
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest request)
        {
            var storedToken = await _context.RefreshTokens
                .Include(rt => rt.User)
                .FirstOrDefaultAsync(rt => rt.Token == request.RefreshToken && !rt.IsRevoked);

            if (storedToken == null || storedToken.ExpiresAt < DateTime.UtcNow)
                return Unauthorized("Invalid or expired refresh token.");

            // Revoke old refresh token
            storedToken.IsRevoked = true;

            // Generate new access token
            var newAccessToken = _jwtTokenGenerator.GenerateToken(storedToken.User);

            // Generate new refresh token (rotate)
            var newRefreshToken = Guid.NewGuid().ToString();
            _context.RefreshTokens.Add(new RefreshToken
            {
                Token = newRefreshToken,
                UserId = storedToken.UserId,
                ExpiresAt = DateTime.UtcNow.AddDays(30),
                IsRevoked = false
            });

            await _context.SaveChangesAsync();

            return Ok(new LoginResponseDto
            {
                Token = newAccessToken,
                RefreshToken = newRefreshToken,
                UserId = storedToken.User.Id,
                UserName = storedToken.User.UserName,
                Email = storedToken.User.Email
            });
        }
    }
}
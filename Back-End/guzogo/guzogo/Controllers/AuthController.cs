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
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            var token = await _authService.RegisterAndSendVerificationAsync(dto);
            if (token == null)
                return BadRequest(new { message = "Email already exists." });

            return Ok(new { message = "Registration successful. Please check your email to verify your account." });
        }

        [HttpPost("verify-email")]
        public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailDto dto)
        {
            var result = await _authService.VerifyEmailAsync(dto.Token);
            if (!result)
                return BadRequest(new { message = "Invalid or expired verification token." });

            return Ok(new { message = "Email verified successfully. You can now log in." });
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
        {
            await _authService.SendPasswordResetEmailAsync(dto.Email);
            // Always return success even if email doesn't exist (security best practice)
            return Ok(new { message = "If an account with that email exists, a password reset link has been sent." });
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
        {
            var result = await _authService.ResetPasswordAsync(dto.Token, dto.NewPassword);
            if (!result)
                return BadRequest(new { message = "Invalid or expired reset token." });

            return Ok(new { message = "Password has been reset successfully." });
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

        [HttpPost("resend-verification")]
        public async Task<IActionResult> ResendVerification([FromBody] ResendVerificationDto dto)
        {
            var result = await _authService.ResendVerificationEmailAsync(dto.Email);
            if (!result)
                return BadRequest(new { message = "No unverified account found with that email." });
            return Ok(new { message = "Verification email resent. Please check your inbox." });
        }
    }
}
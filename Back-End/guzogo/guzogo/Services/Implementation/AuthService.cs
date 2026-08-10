//using guzogo.Data;
//using guzogo.DTOs.Auth;
//using guzogo.Entities;
//using guzogo.Services.Interface;
using guzogo.Data;
using guzogo.DTOs.Auth;
using guzogo.Entities;
using guzogo.Helpers;
using guzogo.Services.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace guzogo.Services.Implementation
{
    public class AuthService : IAuthService
    {
        private readonly ApplicationDbContext _context;
        private readonly PasswordHasher<User> _passwordHasher;
        private readonly JwtTokenGenerator _jwtTokenGenerator;
        private readonly IEmailService _emailService;
        private readonly IConfiguration _configuration;

        public AuthService(ApplicationDbContext context, JwtTokenGenerator jwtTokenGenerator,
            IEmailService emailService,
            IConfiguration configuration)
        {
            _context = context;
            _passwordHasher = new PasswordHasher<User>();
            _jwtTokenGenerator = jwtTokenGenerator;
            _emailService = emailService;
            _configuration = configuration;
        }
     

        public async Task<bool> RegisterAsync(RegisterDto registerDto)
        {
            // Check if email already exists
            var existingUser = await _context.Users
                .AnyAsync(u => u.Email == registerDto.Email);


            if (existingUser)
            {
                return false;
            }


            // Create new user (set PasswordHash after creating the instance so we can pass
            // the user object into the PasswordHasher)
            var user = new User
            {
                Email = registerDto.Email,
                UserName = registerDto.UserName,
                CreatedAt = DateTime.UtcNow
            };

            // Hash and set the password
            user.PasswordHash = _passwordHasher.HashPassword(user, registerDto.Password);


            _context.Users.Add(user);


            await _context.SaveChangesAsync();


            return true;
        }

        public async Task<string?> RegisterAndSendVerificationAsync(RegisterDto dto)
        {
            if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
                return null;

            var user = new User
            {
                Email = dto.Email,
                UserName = dto.UserName,
                CreatedAt = DateTime.UtcNow
            };
            user.PasswordHash = _passwordHasher.HashPassword(user, dto.Password);

            // Generate token and save
            user.EmailVerificationToken = Guid.NewGuid().ToString();
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Log the token that was actually persisted
            Console.WriteLine($"🔑 Verification token saved for {user.Email}: {user.EmailVerificationToken}");

            // Build email link using the SAME token
            var appUrl = _configuration["AppUrl"] ?? "http://localhost:4200";
            var verificationLink = $"{appUrl}/verify-email?token={user.EmailVerificationToken}";

            var body = $@"
<!DOCTYPE html>
<html>
<head><meta charset='UTF-8'></head>
<body style='margin:0; padding:0; background-color:#070a11; font-family:Arial, sans-serif;'>
<table width='100%' cellpadding='0' cellspacing='0' style='background-color:#070a11; padding:40px 0;'>
  <tr>
    <td align='center'>
      <table width='480' cellpadding='0' cellspacing='0' style='background-color:#0f132a; border-radius:16px; overflow:hidden; border:1px solid #2a305e;'>
        <tr>
          <td style='padding:40px 30px 20px; text-align:center;'>
            <span style='font-size:28px; font-weight:bold; background:linear-gradient(90deg, #22d3ee, #6366f1); -webkit-background-clip:text; -webkit-text-fill-color:transparent;'>GuzoGo</span>
          </td>
        </tr>
        <tr>
          <td style='padding:0 30px 30px; text-align:center; color:#cbd5e1; font-size:16px;'>
            <h2 style='color:#fff; margin-bottom:10px;'>Verify your email address</h2>
            <p>Thanks for joining GuzoGo! Click the button below to activate your account.</p>
            <a href='{verificationLink}' style='display:inline-block; margin:20px 0; padding:14px 36px; background:linear-gradient(90deg, #4f46e5, #06b6d4); color:#fff; text-decoration:none; border-radius:12px; font-weight:bold; font-size:16px;'>Verify Email</a>
            <p style='font-size:14px; color:#94a3b8;'>If you didn't create an account, ignore this email.</p>
          </td>
        </tr>
        <tr>
          <td style='padding:20px 30px; background-color:#080b1a; text-align:center; font-size:12px; color:#64748b; border-top:1px solid #1e264d;'>
            © {DateTime.Now.Year} GuzoGo. All rights reserved.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>";

            await _emailService.SendEmailAsync(user.Email, "Verify your GuzoGo account", body);
            return user.EmailVerificationToken;
        }

        public async Task<bool> VerifyEmailAsync(string token)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.EmailVerificationToken == token);
            if (user == null)
            {
                // Maybe the user is already verified? Check if the token is null but email is verified
                // We don't know the user from just the token, but we can check if any user has this token.
                // If token is empty or invalid, just return false.
                return false;
            }

            user.EmailVerified = true;
            user.EmailVerificationToken = null;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> SendPasswordResetEmailAsync(string email)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null) return false;

            user.PasswordResetToken = Guid.NewGuid().ToString();
            user.PasswordResetTokenExpiry = DateTime.UtcNow.AddHours(1);
            await _context.SaveChangesAsync();

            var appUrl = _configuration["AppUrl"] ?? "http://localhost:4200";
            var resetLink = $"{appUrl}/reset-password?token={user.PasswordResetToken}";

            var body = $@"
<!DOCTYPE html>
<html>
<head><meta charset='UTF-8'></head>
<body style='margin:0; padding:0; background-color:#070a11; font-family:Arial, sans-serif;'>
<table width='100%' cellpadding='0' cellspacing='0' style='background-color:#070a11; padding:40px 0;'>
  <tr>
    <td align='center'>
      <table width='480' cellpadding='0' cellspacing='0' style='background-color:#0f132a; border-radius:16px; overflow:hidden; border:1px solid #2a305e;'>
        <tr>
          <td style='padding:40px 30px 20px; text-align:center;'>
            <span style='font-size:28px; font-weight:bold; background:linear-gradient(90deg, #22d3ee, #6366f1); -webkit-background-clip:text; -webkit-text-fill-color:transparent;'>GuzoGo</span>
          </td>
        </tr>
        <tr>
          <td style='padding:0 30px 30px; text-align:center; color:#cbd5e1; font-size:16px;'>
            <h2 style='color:#fff; margin-bottom:10px;'>Reset your password</h2>
            <p>We received a request to reset your password. Click the button below to create a new password.</p>
            <a href='{resetLink}' style='display:inline-block; margin:20px 0; padding:14px 36px; background:linear-gradient(90deg, #4f46e5, #06b6d4); color:#fff; text-decoration:none; border-radius:12px; font-weight:bold; font-size:16px;'>Reset Password</a>
            <p style='font-size:14px; color:#94a3b8;'>This link expires in 1 hour. If you didn't request this, please ignore.</p>
          </td>
        </tr>
        <tr>
          <td style='padding:20px 30px; background-color:#080b1a; text-align:center; font-size:12px; color:#64748b; border-top:1px solid #1e264d;'>
            © {DateTime.Now.Year} GuzoGo. All rights reserved.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>";

            await _emailService.SendEmailAsync(user.Email, "GuzoGo Password Reset", body);
            return true;
        }

        public async Task<bool> ResetPasswordAsync(string token, string newPassword)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u =>
                u.PasswordResetToken == token &&
                u.PasswordResetTokenExpiry > DateTime.UtcNow);

            if (user == null) return false;

            user.PasswordHash = _passwordHasher.HashPassword(user, newPassword);
            user.PasswordResetToken = null;
            user.PasswordResetTokenExpiry = null;
            await _context.SaveChangesAsync();
            return true;
        }

        // Your existing LoginAsync remains, but you should check EmailVerified == true before allowing login.
        public async Task<LoginResponseDto?> LoginAsync(LoginDto loginDto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == loginDto.Email);
            if (user == null) return null;

            var result = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, loginDto.Password);
            if (result == PasswordVerificationResult.Failed) return null;

            // Block login if email not verified
            if (!user.EmailVerified) return null;

            var accessToken = _jwtTokenGenerator.GenerateToken(user);
            var refreshToken = Guid.NewGuid().ToString();

            _context.RefreshTokens.Add(new RefreshToken
            {
                Token = refreshToken,
                UserId = user.Id,
                ExpiresAt = DateTime.UtcNow.AddDays(30),
                IsRevoked = false
            });
            await _context.SaveChangesAsync();

            return new LoginResponseDto
            {
                Token = accessToken,
                RefreshToken = refreshToken,
                UserId = user.Id,
                UserName = user.UserName,
                Email = user.Email
            };
        }

        //public async Task<LoginResponseDto?> LoginAsync(LoginDto loginDto)
        //{
        //    var user = await _context.Users
        //        .FirstOrDefaultAsync(u => u.Email == loginDto.Email);

        //    if (user == null) return null;

        //    var result = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, loginDto.Password);
        //    if (result == PasswordVerificationResult.Failed) return null;

        //    // Generate access token
        //    var accessToken = _jwtTokenGenerator.GenerateToken(user);

        //    // Generate refresh token
        //    var refreshToken = Guid.NewGuid().ToString();
        //    var refreshTokenEntity = new RefreshToken
        //    {
        //        Token = refreshToken,
        //        UserId = user.Id,
        //        ExpiresAt = DateTime.UtcNow.AddDays(30), // refresh token lives 30 days
        //        IsRevoked = false
        //    };

        //    _context.RefreshTokens.Add(refreshTokenEntity);
        //    await _context.SaveChangesAsync();

        //    return new LoginResponseDto
        //    {
        //        Token = accessToken,
        //        RefreshToken = refreshToken,
        //        UserId = user.Id,
        //        UserName = user.UserName,
        //        Email = user.Email
        //    };
        //}

        public async Task<bool> ResendVerificationEmailAsync(string email)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email && !u.EmailVerified);
            if (user == null) return false;

            // Generate a new token (invalidates old one)
            user.EmailVerificationToken = Guid.NewGuid().ToString();
            await _context.SaveChangesAsync();

            var appUrl = _configuration["AppUrl"] ?? "http://localhost:4200";
            var verificationLink = $"{appUrl}/verify-email?token={user.EmailVerificationToken}";

            var body = $@"
        <html>... (same email template as before) ...
            <a href='{verificationLink}'>Verify Email</a>
        ...</html>";

            await _emailService.SendEmailAsync(user.Email, "Verify your GuzoGo account", body);
            return true;
        }

    }
}

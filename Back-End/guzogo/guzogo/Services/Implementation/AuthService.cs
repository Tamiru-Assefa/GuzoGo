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

        public AuthService(ApplicationDbContext context, JwtTokenGenerator jwtTokenGenerator)
        {
            _context = context;
            _passwordHasher = new PasswordHasher<User>();
            _jwtTokenGenerator = jwtTokenGenerator;
        }
        //public AuthService(ApplicationDbContext context)
        //{
        //    _context = context;
        //    _passwordHasher = new PasswordHasher<User>();
        //}


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

        public async Task<LoginResponseDto?> LoginAsync(LoginDto loginDto)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == loginDto.Email);

            if (user == null) return null;

            var result = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, loginDto.Password);
            if (result == PasswordVerificationResult.Failed) return null;

            // Generate access token
            var accessToken = _jwtTokenGenerator.GenerateToken(user);

            // Generate refresh token
            var refreshToken = Guid.NewGuid().ToString();
            var refreshTokenEntity = new RefreshToken
            {
                Token = refreshToken,
                UserId = user.Id,
                ExpiresAt = DateTime.UtcNow.AddDays(30), // refresh token lives 30 days
                IsRevoked = false
            };

            _context.RefreshTokens.Add(refreshTokenEntity);
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


    }
}

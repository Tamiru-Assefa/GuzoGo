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
            // Find user by email
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == loginDto.Email);

            // User not found
            if (user == null)
            {
                return null;
            }

            // Verify password
            var result = _passwordHasher.VerifyHashedPassword(
                user,
                user.PasswordHash,
                loginDto.Password
            );

            // Invalid password
            if (result == PasswordVerificationResult.Failed)
            {
                return null;
            }

            // Generate JWT Token
            var token = _jwtTokenGenerator.GenerateToken(user);

            // Return response
            return new LoginResponseDto
            {
                Token = token,
                UserId = user.Id,
                UserName = user.UserName,
                Email = user.Email
            };
        }


    }
}

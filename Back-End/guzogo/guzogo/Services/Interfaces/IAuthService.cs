using guzogo.DTOs.Auth; 

namespace guzogo.Services.Interfaces
{
    public interface IAuthService
    {
        Task<bool> RegisterAsync(RegisterDto registerDto);

        //Task<string?> LoginAsync(LoginDto loginDto);
        Task<LoginResponseDto?> LoginAsync(LoginDto loginDto);

        Task<string?> RegisterAndSendVerificationAsync(RegisterDto dto);
        Task<bool> VerifyEmailAsync(string token);
        Task<bool> SendPasswordResetEmailAsync(string email);
        Task<bool> ResetPasswordAsync(string token, string newPassword);
        Task<bool> ResendVerificationEmailAsync(string email);
    }
}
using guzogo.DTOs.Auth; 

namespace guzogo.Services.Interfaces
{
    public interface IAuthService
    {
        Task<bool> RegisterAsync(RegisterDto registerDto);

        //Task<string?> LoginAsync(LoginDto loginDto);
        Task<LoginResponseDto?> LoginAsync(LoginDto loginDto);
    }
}
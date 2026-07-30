namespace guzogo.DTOs.Auth
{
    public class LoginResponseDto
    {
        public string Token { get; set; } = string.Empty;

        public int UserId { get; set; }

        public string UserName { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;
    }
}
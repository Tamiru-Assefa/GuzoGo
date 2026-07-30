using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using guzogo.Entities;
using Microsoft.IdentityModel.Tokens;

namespace guzogo.Helpers
{
    public class JwtTokenGenerator
    {
        private readonly IConfiguration _configuration;


        public JwtTokenGenerator(IConfiguration configuration)
        {
            _configuration = configuration;
        }


        public string GenerateToken(User user)
        {
            var claims = new[]
            {
                new Claim(
                    ClaimTypes.NameIdentifier,
                    user.Id.ToString()
                ),

                new Claim(
                    JwtRegisteredClaimNames.Email,
                    user.Email
                ),

                new Claim(
                    JwtRegisteredClaimNames.Name,
                    user.UserName
                )
            };


            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(
                    _configuration["Jwt:Key"]!
                )
            );


            var credentials = new SigningCredentials(
                key,
                SecurityAlgorithms.HmacSha256
            );


            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],

                audience: _configuration["Jwt:Audience"],

                claims: claims,

                expires: DateTime.UtcNow.AddMinutes(
                    Convert.ToDouble(
                        _configuration["Jwt:DurationInMinutes"]
                    )
                ),

                signingCredentials: credentials
            );


            return new JwtSecurityTokenHandler()
                .WriteToken(token);
        }
    }
}
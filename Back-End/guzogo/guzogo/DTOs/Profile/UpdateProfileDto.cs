using guzogo.Enums;
using System.ComponentModel.DataAnnotations;


namespace guzogo.DTOs.Profile
{
    public class UpdateProfileDto
    {

        [Required]
        [StringLength(50)]
        public string FirstName { get; set; } = string.Empty;


        [Required]
        [StringLength(50)]
        public string LastName { get; set; } = string.Empty;


        public string? Profession { get; set; }

        public ExperienceLevel ExperienceLevel { get; set; }


        public string? Company { get; set; }


        public string? Country { get; set; }


        public string? City { get; set; }


        public string? Bio { get; set; }


        public string? LinkedInUrl { get; set; }


        public string? GitHubUrl { get; set; }


        public string? PortfolioUrl { get; set; }


        public string? ProfilePictureUrl { get; set; }
    }
}
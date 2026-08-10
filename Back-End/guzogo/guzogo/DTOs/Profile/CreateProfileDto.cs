using guzogo.Enums;
using System.ComponentModel.DataAnnotations;

namespace guzogo.DTOs.Profile
{
    public class CreateProfileDto
    {
        [Required]
        public int UserId { get; set; }


        [Required]
        [StringLength(50)]
        public string FirstName { get; set; } = string.Empty;


        [Required]
        [StringLength(50)]
        public string LastName { get; set; } = string.Empty;



        public ExperienceLevel ExperienceLevel { get; set; }

        public string? Profession { get; set; }


        [StringLength(100)]
        public string? Company { get; set; }


        [StringLength(100)]
        public string? Country { get; set; }


        [StringLength(100)]
        public string? City { get; set; }


        [StringLength(500)]
        public string? Bio { get; set; }


        public string? LinkedInUrl { get; set; }

        public string? GitHubUrl { get; set; }

        public string? PortfolioUrl { get; set; }


        public string? ProfilePictureUrl { get; set; }
    }
}
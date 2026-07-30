namespace guzogo.DTOs.Profile
{
    public class PublicProfileDto
    {
        public int Id { get; set; }

        public string FirstName { get; set; } = string.Empty;

        public string LastName { get; set; } = string.Empty;


        public string ProfessionTitle { get; set; } = string.Empty;

        public string ProfessionCategory { get; set; } = string.Empty;


        public string? ProfilePictureUrl { get; set; }


        public string? Company { get; set; }


        public string? Country { get; set; }

        public string? City { get; set; }


        public string? Bio { get; set; }


        public string? LinkedInUrl { get; set; }

        public string? GitHubUrl { get; set; }

        public string? PortfolioUrl { get; set; }


        public int ExperienceLevel { get; set; }
    }
}
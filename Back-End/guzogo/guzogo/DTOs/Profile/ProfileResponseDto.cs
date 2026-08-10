namespace guzogo.DTOs.Profile
{
    //THIS IS FOR EXPORTING PROFILE DATA TO FRONTEND,
    public class ProfileResponseDto
    {
        public int Id { get; set; }

        public int UserId { get; set; }


        public string FirstName { get; set; } = string.Empty;

        public string LastName { get; set; } = string.Empty;

        public string? Profession { get; set; }


        public string ProfessionTitle { get; set; } = string.Empty;


        public string ProfessionCategory { get; set; } = string.Empty;


        public string? Country { get; set; }

        public string? City { get; set; }


        public string? Bio { get; set; }
        public string? LinkedInUrl { get; set; }     
        public string? GitHubUrl { get; set; }       
        public string? PortfolioUrl { get; set; }
        public int ExperienceLevel { get; set; }    
        public decimal Rating { get; set; }         
        public int TotalRatings { get; set; }      
        public string? BadgeLevel { get; set; }  
        public string ProfilePictureUrl { get; set; } = string.Empty;
    }
}
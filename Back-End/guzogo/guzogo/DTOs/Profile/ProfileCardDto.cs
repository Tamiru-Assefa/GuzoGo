namespace guzogo.DTOs.Profile
{
    public class ProfileCardDto
    {
        public int Id { get; set; }


        public string FirstName { get; set; } = string.Empty;


        public string LastName { get; set; } = string.Empty;


        public string ProfessionTitle { get; set; } = string.Empty;


        public string ProfessionCategory { get; set; } = string.Empty;


        public string? ProfilePictureUrl { get; set; }


        public string? Country { get; set; }


        public string? City { get; set; }


        public int ExperienceLevel { get; set; }
    }
}
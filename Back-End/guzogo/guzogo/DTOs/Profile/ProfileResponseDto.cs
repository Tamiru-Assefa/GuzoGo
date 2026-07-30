namespace guzogo.DTOs.Profile
{
    //THIS IS FOR EXPORTING PROFILE DATA TO FRONTEND,
    public class ProfileResponseDto
    {
        public int Id { get; set; }

        public int UserId { get; set; }


        public string FirstName { get; set; } = string.Empty;

        public string LastName { get; set; } = string.Empty;


        public string ProfessionTitle { get; set; } = string.Empty;


        public string ProfessionCategory { get; set; } = string.Empty;


        public string? Country { get; set; }

        public string? City { get; set; }


        public string? Bio { get; set; }
    }
}
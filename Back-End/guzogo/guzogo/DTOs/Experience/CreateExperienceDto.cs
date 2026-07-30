namespace guzogo.DTOs.Experience
{
    public class CreateExperienceDto
    {
        public string JobTitle { get; set; } = string.Empty;

        public string CompanyName { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;


        public DateTime StartDate { get; set; }


        public DateTime? EndDate { get; set; }


        public bool IsCurrent { get; set; }
    }
}
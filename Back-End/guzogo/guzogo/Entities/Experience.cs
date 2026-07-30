namespace guzogo.Entities
{
    public class Experience
    {
        public int Id { get; set; }


        // Foreign Key
        public int ProfileId { get; set; }


        // Navigation
        public Profile Profile { get; set; } = null!;


        public string JobTitle { get; set; } = string.Empty;


        public string CompanyName { get; set; } = string.Empty;


        public string Description { get; set; } = string.Empty;


        public DateTime StartDate { get; set; }


        public DateTime? EndDate { get; set; }


        public bool IsCurrent { get; set; }
    }
}
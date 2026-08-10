namespace guzogo.Entities
{
    public class MatchPreference
    {
        public int Id { get; set; }

        public int UserId { get; set; }

        public User User { get; set; } = null!;


        // ==========================================
        // NEW AI / FREE-TEXT MATCHING
        // ==========================================

        // Example:
        // "Cloud Engineer"
        // "Someone experienced in AWS and DevOps"
        public string DesiredProfession { get; set; } = string.Empty;


        // Example:
        // ["AWS", "Docker", "Kubernetes", "Terraform"]
        //
        // Stored as JSON in the database.
        public List<string> DesiredSkills { get; set; } = new();


        // Example:
        // "Networking"
        // "Hiring"
        // "Job Seeking"
        public string Goal { get; set; } = string.Empty;


        // Optional additional information that can help
        // the AI understand what kind of person the user wants.
        public string? AdditionalDescription { get; set; }


        // ==========================================
        // OLD MATCHING SYSTEM
        // Keep temporarily as fallback
        // ==========================================

        public int? PreferredProfessionId { get; set; }

        public ProfessionTitle? PreferredProfession { get; set; }


        public ICollection<PreferenceSkill> PreferenceSkills { get; set; }
            = new List<PreferenceSkill>();


        // ==========================================
        // MATCHING STATE
        // ==========================================

        public string? MatchType { get; set; }

        public bool IsSearching { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
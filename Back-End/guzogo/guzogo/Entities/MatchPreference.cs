namespace guzogo.Entities
{
    public class MatchPreference
    {
        public int Id { get; set; }


        // User who created this preference
        public int UserId { get; set; }


        public User User { get; set; } = null!;



        // Looking for profession
        public int? PreferredProfessionId { get; set; }


        public ProfessionTitle? PreferredProfession { get; set; }



        // Looking for skill
        
        public ICollection<PreferenceSkill> PreferenceSkills { get; set; }
            = new List<PreferenceSkill>();


        //public Skill? PreferredSkill { get; set; }



        // Example:
        // Networking
        // Learning
        // Mentoring
        // Collaboration
        public string Goal { get; set; } = string.Empty;



        // Example:
        // Random
        // Specific
        public string MatchType { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; }
        public bool IsSearching { get; set; } = true;
    }
}
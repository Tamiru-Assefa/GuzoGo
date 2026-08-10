namespace guzogo.DTOs.MatchPreference
{
    public class CreateMatchPreferenceDto
    {
        // Existing fields - keep for compatibility
        public int? PreferredProfessionId { get; set; }

        public List<int> PreferredSkillIds { get; set; } = new();

        // New AI/free-text fields
        public string DesiredProfession { get; set; } = string.Empty;

        public List<string> DesiredSkills { get; set; } = new();

        public string? AdditionalDescription { get; set; }

        public string Goal { get; set; } = string.Empty;

        public string MatchType { get; set; } = string.Empty;

        public bool IsSearching { get; set; }
    }
}
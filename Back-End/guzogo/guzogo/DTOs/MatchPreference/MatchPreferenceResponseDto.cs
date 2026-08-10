namespace guzogo.DTOs.MatchPreference
{
    public class MatchPreferenceResponseDto
    {
        public int UserId { get; set; }

        // OLD
        public int? PreferredProfessionId { get; set; }

        public List<int> PreferredSkillIds { get; set; } = new();

        // NEW AI
        public string DesiredProfession { get; set; } = string.Empty;

        public List<string> DesiredSkills { get; set; } = new();

        public string? AdditionalDescription { get; set; }

        // COMMON
        public string Goal { get; set; } = string.Empty;

        public string MatchType { get; set; } = string.Empty;

        public bool IsSearching { get; set; }
    }
}
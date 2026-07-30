namespace guzogo.DTOs.MatchPreference
{
    public class MatchPreferenceResponseDto
    {
        public int UserId { get; set; }


        public int? PreferredProfessionId { get; set; }


        public List<int> PreferredSkillIds { get; set; } = new();


        public string Goal { get; set; } = string.Empty;


        public string MatchType { get; set; } = string.Empty;
        public bool IsSearching { get; set; }

    }
}
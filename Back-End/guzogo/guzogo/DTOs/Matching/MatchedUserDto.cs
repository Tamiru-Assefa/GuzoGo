namespace guzogo.DTOs.Matching
{
    public class MatchedUserDto
    {
        public int UserId { get; set; }

        public string FullName { get; set; } = string.Empty;
        public string? Country { get; set; }

        public string Profession { get; set; } = string.Empty;

        public string? ProfilePictureUrl { get; set; }
        public List<string> Skills { get; set; } = new();
        public int MatchScore { get; set; }
    }
}
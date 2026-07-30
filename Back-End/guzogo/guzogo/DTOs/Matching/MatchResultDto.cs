namespace guzogo.DTOs.Matching
{
    public class MatchResultDto
    {
        public bool Matched { get; set; }

        public int MatchScore { get; set; }

        public MatchedUserDto? User { get; set; }
        public int? SessionId { get; set; }
        public string? RoomId { get; set; }
    }
}
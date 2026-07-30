namespace guzogo.DTOs.Presence
{
    public class PresenceResponseDto
    {
        public int UserId { get; set; }

        public string Status { get; set; } = string.Empty;

        public DateTime LastSeen { get; set; }
    }
}